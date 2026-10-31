import { randomUUID } from "node:crypto";

import prisma from "../libs/prisma.js";
import redis from "../libs/redis.js";
import {
    AUCTION_STATUS_TTL_SECONDS,
    ELIGIBLE_SENTINEL,
    ELIGIBLE_TTL_SECONDS,
    auctionKeyList,
    bidKeys,
    hydrateLotState,
    lotKeyList,
    readLotState,
    runBidEngine,
} from "../libs/biddingStore.js";
import { emitTo, rooms } from "../libs/socket.js";
import { bidOptions, nextValidBid } from "../utils/bidIncrement.js";
import { serializeBigInt } from "../utils/serialize.js";

// =====================================================================
// Live bidding
//
// Bids and proxy bids are settled in Redis (libs/biddingStore.js) and
// pushed to the storefront and the dashboard over Socket.IO. Postgres is
// kept out of the hot path:
//   - each scheduler tick writes the current bid / bid count of lots that
//     changed (syncDirtyLots), so other pages stay roughly current
//   - closing a lot writes its result (see liveAuction.services.js)
//   - proxy bids are written to auto_bids as soon as they're set (with the
//     bidder's IP and device), and reloaded from there with the lot
//   - once the auction ends, every bid is written to the bids table, the
//     proxies are marked inactive and the Redis keys are dropped (flushAuctionBids)
// =====================================================================

const httpError = (message, statusCode = 400, details) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (details) error.details = details;
    return error;
};

/** Auctions whose lots take bids (LIVE) or proxy bids (any of these) */
export const BIDDING_AUCTION_STATUSES = ["SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

/** Auctions whose bid history is written to the database and cleared from Redis */
const FINISHED_AUCTION_STATUSES = ["ENDED", "SETTLED", "CANCELLED"];

/** Lots that can still take a proxy bid: only before they open (mirrors the PROXY check in biddingStore.js) */
export const PROXY_LOT_STATUSES = ["DRAFT", "SCHEDULED"];

const MAX_USER_AGENT = 500;

/** Verified lot bidders who may actually bid: a bidder moved back to USER, made inactive, or whose KYC approval was taken back, keeps their lot rows but can't bid */
const ELIGIBLE_LOT_BIDDER_WHERE = {
    status: "VERIFIED",
    user: {
        deletedAt: null,
        status: "ACTIVE",
        role: { name: "BIDDER" },
        kyc: { is: { status: "VERIFIED" } },
    },
};

/** Bid sources as stored in Redis (M = online, F = floor, P = proxy) */
const BID_SOURCES = { M: "MANUAL", F: "FLOOR", P: "PROXY" };

const MAX_BIDS_PER_SECOND = 5;

const displayName = (user) => {
    const p = user?.profile;
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
    return p?.displayName || full || user?.username || null;
};

const formatMoney = (amount, code) => {
    try {
        return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
            style: "currency",
            currency: code,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${code} ${amount}`;
    }
};

// =====================================================================
// LOADING A LOT INTO REDIS
// =====================================================================

const LOT_SOURCE_SELECT = {
    id: true,
    uuid: true,
    itemNumber: true,
    title: true,
    status: true,
    startingPrice: true,
    reservePrice: true,
    currentBid: true,
    currentBidderId: true,
    bidCount: true,
    currency: { select: { code: true, symbol: true } },
    auction: {
        select: {
            id: true,
            uuid: true,
            status: true,
            deletedAt: true,
            currency: { select: { code: true, symbol: true } },
            rules: {
                where: { ruleType: "BID_INCREMENT", isActive: true },
                select: { valueType: true, rangeMin: true, rangeMax: true, value: true },
            },
        },
    },
};

const loadLotSource = async (lotUuid) => {
    const lot = await prisma.auctionItem.findUnique({ where: { uuid: lotUuid }, select: LOT_SOURCE_SELECT });
    if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);
    return lot;
};

const decimalOrNull = (value) => (value === null ? null : Number(value));

/** Lot facts that can change before the lot opens — refreshed whenever it starts or closes. */
const staticFields = (lot) => {
    const currency = lot.currency ?? lot.auction.currency;
    return {
        lotId: lot.id.toString(),
        auctionId: lot.auction.id.toString(),
        auctionUuid: lot.auction.uuid,
        itemNumber: lot.itemNumber.toString(),
        title: lot.title,
        status: lot.status,
        startingPrice: Number(lot.startingPrice),
        reservePrice: lot.reservePrice === null ? "" : Number(lot.reservePrice),
        currencyCode: currency.code,
        currencySymbol: currency.symbol ?? "",
        rules: JSON.stringify(
            lot.auction.rules.map((rule) => ({
                valueType: rule.valueType,
                rangeMin: decimalOrNull(rule.rangeMin),
                rangeMax: decimalOrNull(rule.rangeMax),
                value: Number(rule.value),
            }))
        ),
    };
};

/** The bid position as last saved in the database (used only when Redis has nothing for the lot). */
const savedPosition = (lot) => {
    const count = Number(lot.bidCount);
    const hasBids = count > 0 && lot.currentBid !== null;
    return {
        bidCount: hasBids ? count : 0,
        currentBid: hasBids ? Number(lot.currentBid) : "",
        leaderId: hasBids && lot.currentBidderId ? lot.currentBidderId.toString() : "",
        seq: hasBids ? count : 0,
    };
};

const setAuctionStatusCache = (auctionUuid, status) =>
    redis.set(bidKeys.auctionStatus(auctionUuid), status, "EX", AUCTION_STATUS_TTL_SECONDS);

const ensureAuctionStatus = async (auctionUuid) => {
    const cached = await redis.get(bidKeys.auctionStatus(auctionUuid));
    if (cached) return cached;
    const auction = await prisma.auction.findUnique({ where: { uuid: auctionUuid }, select: { status: true } });
    const status = auction?.status ?? "CANCELLED";
    await setAuctionStatusCache(auctionUuid, status);
    return status;
};

/**
 * Puts the lot's saved proxy bids back into Redis (after its state was created
 * there), so proxies left days before the lot opens survive a Redis restart.
 * HSETNX: a proxy set in the meantime is never overwritten.
 */
const restoreProxies = async (lotUuid, lotId) => {
    const rows = await prisma.autoBid.findMany({
        where: { itemId: BigInt(lotId), isActive: true, withdrawnAt: null },
        select: { bidderId: true, maxAmount: true, createdAt: true },
    });
    if (rows.length === 0) return;

    const pipe = redis.pipeline();
    for (const row of rows) {
        pipe.hsetnx(
            bidKeys.proxies(lotUuid),
            row.bidderId.toString(),
            JSON.stringify({ max: Number(row.maxAmount), at: row.createdAt.getTime() })
        );
    }
    await pipe.exec();
};

/** The lot's live state, loaded from the database the first time it's needed. */
const ensureLotState = async (lotUuid) => {
    const existing = await readLotState(lotUuid);
    if (existing) return existing;

    const lot = await loadLotSource(lotUuid);
    if (!BIDDING_AUCTION_STATUSES.includes(lot.auction.status)) {
        throw httpError("Bidding is closed for this auction", 409);
    }

    const created = await hydrateLotState({
        lotUuid,
        auctionUuid: lot.auction.uuid,
        fields: { ...staticFields(lot), ...savedPosition(lot) },
    });
    if (created) await restoreProxies(lotUuid, lot.id);
    await setAuctionStatusCache(lot.auction.uuid, lot.auction.status);
    return readLotState(lotUuid);
};

// =====================================================================
// WHO MAY BID (verified lot bidders, cached per lot)
// =====================================================================

const isVerifiedBidder = async (lotUuid, lotId, userId) => {
    const key = bidKeys.eligible(lotUuid);
    const [[, loaded], [, member]] = await redis
        .pipeline()
        .sismember(key, ELIGIBLE_SENTINEL)
        .sismember(key, String(userId))
        .exec();
    if (loaded) return member === 1;

    const rows = await prisma.lotBidder.findMany({
        where: { itemId: BigInt(lotId), ...ELIGIBLE_LOT_BIDDER_WHERE },
        select: { userId: true },
    });
    const ids = rows.map((row) => row.userId.toString());
    await redis
        .multi()
        .del(key)
        .sadd(key, ELIGIBLE_SENTINEL, ...ids)
        .expire(key, ELIGIBLE_TTL_SECONDS)
        .exec();
    return ids.includes(String(userId));
};

const notVerifiedError = async (lotId, userId) => {
    const [row, account] = await Promise.all([
        prisma.lotBidder.findUnique({
            where: { itemId_userId: { itemId: BigInt(lotId), userId: BigInt(userId) } },
            select: { status: true },
        }),
        prisma.user.findUnique({
            where: { id: BigInt(userId) },
            select: { status: true, role: { select: { name: true } }, kyc: { select: { status: true } } },
        }),
    ]);
    if (account?.status === "INACTIVE") {
        return httpError("Your account is awaiting activation by the auction house. You can bid once it's active.", 403);
    }
    if (account?.role.name !== "BIDDER") {
        return httpError("Only bidder accounts can bid. The auction house will make you a bidder once approved.", 403);
    }
    if (account.kyc?.status !== "VERIFIED") {
        return httpError("Your KYC must be verified before you can bid. Check your profile for documents to resubmit.", 403);
    }
    return row
        ? httpError("Your registration for this lot is awaiting verification by the auction house", 403)
        : httpError("Register for this auction to bid on its lots", 403);
};

/**
 * Call after lot bidders are verified, unverified or removed, so the next bid
 * re-reads who may bid. Users who lost access also lose their proxy bids
 * (bids already placed stand).
 */
export const invalidateBidderAccess = async ({ auctionId, lotUuids, revokedUserIds = [] }) => {
    try {
        const uuids =
            lotUuids ??
            (await prisma.auctionItem.findMany({ where: { auctionId: BigInt(auctionId) }, select: { uuid: true } })).map(
                (lot) => lot.uuid
            );
        if (uuids.length === 0) return;

        const pipe = redis.pipeline();
        for (const uuid of uuids) {
            pipe.del(bidKeys.eligible(uuid));
            if (revokedUserIds.length) pipe.hdel(bidKeys.proxies(uuid), ...revokedUserIds.map(String));
        }
        await pipe.exec();

        // the saved rows stay for the record, marked withdrawn (lots already closed keep theirs as they ran)
        if (revokedUserIds.length) {
            await prisma.autoBid.updateMany({
                where: {
                    item: { uuid: { in: uuids }, status: { in: [...PROXY_LOT_STATUSES, "ACTIVE"] } },
                    bidderId: { in: revokedUserIds.map((id) => BigInt(id)) },
                    isActive: true,
                },
                data: { isActive: false, withdrawnAt: new Date(), withdrawnReason: "The bidder's access to the lot was withdrawn" },
            });
        }
    } catch (error) {
        // the cache expires on its own (ELIGIBLE_TTL_SECONDS)
        console.error("[bidding] could not refresh bidder access:", error);
    }
};

// =====================================================================
// BIDDERS (paddle + name, cached per auction)
// =====================================================================

const loadBidder = async (auctionUuid, auctionId, userId) => {
    const [participant, user] = await Promise.all([
        prisma.auctionParticipant.findUnique({
            where: { auctionId_userId: { auctionId: BigInt(auctionId), userId: BigInt(userId) } },
            select: { paddleNumber: true },
        }),
        prisma.user.findUnique({
            where: { id: BigInt(userId) },
            select: { uuid: true, username: true, profile: { select: { displayName: true, firstName: true, lastName: true } } },
        }),
    ]);
    const info = { uuid: user?.uuid ?? null, paddle: participant?.paddleNumber ?? null, name: displayName(user) };
    await redis.hset(bidKeys.auctionBidders(auctionUuid), String(userId), JSON.stringify(info));
    return info;
};

/** Map of userId -> { uuid, paddle, name }, loading any the cache doesn't have yet. */
const biddersById = async (auctionUuid, auctionId, userIds) => {
    const ids = [...new Set(userIds.filter(Boolean).map(String))];
    if (ids.length === 0) return new Map();

    const cached = await redis.hmget(bidKeys.auctionBidders(auctionUuid), ...ids);
    const result = new Map();
    await Promise.all(
        ids.map(async (id, index) => {
            result.set(id, cached[index] ? JSON.parse(cached[index]) : await loadBidder(auctionUuid, auctionId, id));
        })
    );
    return result;
};

// =====================================================================
// VIEWS + BROADCASTS
// =====================================================================

const toPublicBid = (lotUuid, bid) => ({
    uuid: `${lotUuid}:${bid.seq}`,
    amount: String(bid.a),
    source: BID_SOURCES[bid.s] ?? "PROXY",
    placedAt: new Date(bid.t).toISOString(),
});

const currencyOf = (state) => ({ code: state.currencyCode, symbol: state.currencySymbol || null });

/** A lot hash as the storefront sees it (amounts as strings, like the REST API) */
const liveView = (lotUuid, state) => {
    const count = Number(state.bidCount) || 0;
    const currentBid = count > 0 ? String(state.currentBid) : null;
    const nextBid =
        state.nextBid !== undefined && state.nextBid !== ""
            ? String(state.nextBid)
            : String(
                  nextValidBid(
                      { startingPrice: state.startingPrice, currentBid, bidCount: count },
                      JSON.parse(state.rules || "[]")
                  )
              );
    return {
        auctionUuid: state.auctionUuid,
        lotUuid,
        itemNumber: String(state.itemNumber),
        status: state.status === "CLOSING" ? "ACTIVE" : state.status,
        currentBid,
        bidCount: String(count),
        nextBid,
        leaderId: count > 0 && state.leaderId ? String(state.leaderId) : null,
    };
};

const readStats = async (auctionUuid) => {
    const [[, stats], [, bidders]] = await redis
        .pipeline()
        .hgetall(bidKeys.auctionStats(auctionUuid))
        .zcard(bidKeys.auctionCounts(auctionUuid))
        .exec();
    return {
        totalBids: Number(stats.total) || 0,
        manualBids: Number(stats.manual) || 0,
        proxyBids: Number(stats.proxy) || 0,
        bidders: Number(bidders) || 0,
    };
};

/**
 * Pushes a lot's new position:
 *   storefront  lot:update  (bidders by paddle only)
 *   dashboard   bid:new     (every new bid with the bidder's name, plus sale totals)
 *   outbid user bid:outbid
 * `state` is the lot hash merged with the engine's result; `result` is the engine run (or null).
 */
const broadcastLot = async (lotUuid, state, result = null) => {
    try {
        const view = liveView(lotUuid, state);
        const { auctionUuid } = view;
        const bids = result?.bids ?? [];
        const bidders = await biddersById(auctionUuid, state.auctionId, [view.leaderId, ...bids.map((bid) => bid.u)]);
        const { leaderId, ...publicView } = view;
        const update = {
            ...publicView,
            currency: currencyOf(state),
            leadingPaddle: leaderId ? bidders.get(leaderId)?.paddle ?? null : null,
            // newest first, like the ladder
            bids: bids.map((bid) => toPublicBid(lotUuid, bid)).reverse(),
        };

        emitTo(rooms.auction(auctionUuid), "lot:update", update);

        if (bids.length > 0) {
            emitTo(rooms.staff(auctionUuid), "bid:new", {
                ...update,
                title: state.title,
                // the console's quick increments: the next ask and the two steps above it
                bidOptions: bidOptions(view.nextBid, JSON.parse(state.rules || "[]")).map(String),
                bids: bids
                    .map((bid) => ({ ...toPublicBid(lotUuid, bid), bidder: bidders.get(String(bid.u)) ?? null }))
                    .reverse(),
                stats: await readStats(auctionUuid),
            });
        }

        const prevLeader = result?.prevLeader ? String(result.prevLeader) : null;
        if (prevLeader && prevLeader !== leaderId) {
            emitTo(rooms.user(prevLeader), "bid:outbid", {
                auctionUuid,
                lotUuid,
                itemNumber: view.itemNumber,
                title: state.title,
                currentBid: view.currentBid,
                nextBid: view.nextBid,
                currency: update.currency,
            });
        }
    } catch (error) {
        // the bid itself is safe in Redis; clients catch up on their next read
        console.error(`[bidding] broadcast failed for lot ${lotUuid}:`, error);
    }
};

// =====================================================================
// PLACE A BID / SET A PROXY BID
// =====================================================================

const ENGINE_ERRORS = {
    LOT_NOT_LIVE: (lot) => [`Lot #${lot.itemNumber} isn't open for bidding right now`, 409],
    AUCTION_NOT_LIVE: (lot, r) => [r.auctionStatus === "PAUSED" ? "Bidding is paused for this auction" : "This auction isn't live", 409],
    ALREADY_LEADING: () => ["You're already the highest bidder", 409],
    BID_TOO_LOW: (lot, r) => [`The next bid must be at least ${formatMoney(r.nextBid, lot.currencyCode)}`, 400],
    LOT_STARTED: (lot) => [`Lot #${lot.itemNumber} has opened — proxy bids can only be left or changed before a lot opens`, 409],
    PROXY_DISABLED: () => ["Proxy bids are turned off for this auction", 409],
    PROXY_TOO_LOW: (lot, r) => [`Your maximum bid must be at least ${formatMoney(r.nextBid, lot.currencyCode)}`, 400],
    LOT_CLOSED: (lot) => [`Lot #${lot.itemNumber} has closed`, 409],
    AUCTION_CLOSED: () => ["Bidding is closed for this auction", 409],
    NOT_LOADED: () => ["Bidding is closed for this lot", 409],
};

const checkRate = async (userId) => {
    const key = bidKeys.rate(userId);
    const [[, count]] = await redis.multi().incr(key).expire(key, 1).exec();
    if (count > MAX_BIDS_PER_SECOND) throw httpError("You're bidding too fast. Wait a moment and try again.", 429);
};

const runForUser = async ({ mode, lotUuid, userId, amount, ip, userAgent }) => {
    if (!userId) throw httpError("Authenticated user is required", 401);
    await checkRate(userId);

    const lot = await ensureLotState(lotUuid);
    if (!(await isVerifiedBidder(lotUuid, lot.lotId, userId))) throw await notVerifiedError(lot.lotId, userId);

    return settleBid({ mode, lot, lotUuid, userId, amount, ip, userAgent });
};

/** Runs the engine for a bidder already checked as eligible, broadcasts, and returns the bidder's view of the lot. */
const settleBid = async ({ mode, lot, lotUuid, userId, amount, ip, userAgent, errors = ENGINE_ERRORS }) => {
    // paddle + name, so the broadcast never waits on the database
    await biddersById(lot.auctionUuid, lot.auctionId, [userId]);

    const run = async () => {
        await ensureAuctionStatus(lot.auctionUuid);
        return runBidEngine({ mode, lotUuid, auctionUuid: lot.auctionUuid, userId, amount, ip, userAgent });
    };
    let result = await run();
    if (result.err === "NOT_LOADED") {
        // a cache key expired between the checks and the run — reload once
        await ensureLotState(lotUuid);
        result = await run();
    }

    if (result.err) {
        const [message, status] = (errors[result.err] ?? (() => ["Could not place the bid", 409]))(lot, result);
        throw httpError(message, status, result.nextBid !== undefined ? { nextBid: String(result.nextBid) } : undefined);
    }

    const merged = { ...lot, ...result.state };
    await broadcastLot(lotUuid, merged, result);

    const view = liveView(lotUuid, merged);
    return {
        lot,
        result: {
            lotUuid,
            itemNumber: view.itemNumber,
            status: view.status,
            currency: currencyOf(lot),
            currentBid: view.currentBid,
            bidCount: view.bidCount,
            nextBid: view.nextBid,
            leading: view.leaderId === String(userId),
            proxyMax: result.proxyMax !== undefined ? String(result.proxyMax) : null,
            // when the engine accepted the bidder's proxy — it settles equal maximums (earliest wins)
            proxySetAt: result.proxyAt !== undefined ? new Date(result.proxyAt).toISOString() : null,
            bidsPlaced: result.bids.length,
        },
        // the bidder's proxy before this run (PROXY mode), for putting back
        prevProxy: result.prevProxy ?? null,
    };
};

export const placeBidService = async ({ lotUuid, userId, amount, ip, userAgent }) => {
    const { lot, result } = await runForUser({ mode: "BID", lotUuid, userId, amount, ip, userAgent });
    const money = (value) => formatMoney(value, lot.currencyCode);
    return {
        message: result.leading
            ? `Your bid of ${money(amount)} is the highest bid`
            : `Your bid of ${money(amount)} was topped by a proxy bid — the bid is now ${money(result.currentBid)}`,
        data: result,
    };
};

/**
 * A proxy (maximum) bid: one per bidder per lot, left or changed any time
 * before the lot opens — locked once it does. The engine settles it in Redis,
 * then it's saved to auto_bids with the bidder's IP and device; if that save
 * fails Redis goes back to the bidder's previous proxy (or none).
 */
export const setProxyBidService = async ({ lotUuid, userId, maxAmount, ip, userAgent }) => {
    if (!userId) throw httpError("Authenticated user is required", 401);

    const item = await prisma.auctionItem.findUnique({
        where: { uuid: lotUuid },
        select: { id: true, itemNumber: true, status: true, auction: { select: { proxyBiddingEnabled: true } } },
    });
    if (!item) throw httpError("Lot not found", 404);
    if (item.status === "ACTIVE") throw httpError(...ENGINE_ERRORS.LOT_STARTED({ itemNumber: item.itemNumber }));
    if (!item.auction.proxyBiddingEnabled) throw httpError(...ENGINE_ERRORS.PROXY_DISABLED());

    const { lot, result, prevProxy } = await runForUser({ mode: "PROXY", lotUuid, userId, amount: maxAmount, ip, userAgent });

    const record = {
        maxAmount: String(maxAmount),
        isActive: true,
        ipAddress: ip || null,
        userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT) : null,
        withdrawnAt: null,
        withdrawnReason: null,
        // the exact time the engine ranked it by, so a reload from here (restoreProxies) keeps who came first
        createdAt: result.proxySetAt ? new Date(result.proxySetAt) : new Date(),
    };
    try {
        await prisma.autoBid.upsert({
            where: { itemId_bidderId: { itemId: item.id, bidderId: BigInt(userId) } },
            create: { itemId: item.id, bidderId: BigInt(userId), ...record },
            update: record,
        });
    } catch (error) {
        // the lot hasn't opened, so the proxy hasn't bid — safe to put back as it was
        const key = bidKeys.proxies(lotUuid);
        const restore = prevProxy
            ? redis.hset(key, String(userId), JSON.stringify({ max: prevProxy.max, at: prevProxy.at }))
            : redis.hdel(key, String(userId));
        await restore.catch(() => {});
        throw error;
    }

    const max = formatMoney(maxAmount, lot.currencyCode);
    return {
        message: `Your maximum bid of ${max} is ${prevProxy ? "updated" : "set"}. It's placed for you when the auctioneer calls the hammer on Lot #${result.itemNumber}. You can change it until the lot opens.`,
        data: result,
    };
};

// =====================================================================
// FLOOR BID (auctioneer console)
// The auctioneer enters a bid for a paddle raised in the room. The paddle
// holder must be verified on the lot, like any online bidder. Online-only
// (LIVE type) sales take no floor bids.
// =====================================================================

export const placeFloorBidService = async ({ lotUuid, paddleNumber, amount, ip, userAgent }) => {
    const lot = await ensureLotState(lotUuid);
    const paddle = `#${paddleNumber}`;

    const auction = await prisma.auction.findUnique({
        where: { id: BigInt(lot.auctionId) },
        select: {
            auctionType: true,
            participants: { where: { paddleNumber }, select: { userId: true } },
        },
    });
    if (!auction) throw httpError("Auction not found", 404);
    if (auction.auctionType === "LIVE") {
        throw httpError("This is an online-only sale — bids can't be entered from the floor", 409);
    }

    const userId = auction.participants[0]?.userId?.toString();
    if (!userId) throw httpError(`No bidder holds paddle ${paddle} in this auction`, 404);
    if (!(await isVerifiedBidder(lotUuid, lot.lotId, userId))) {
        throw httpError(`Paddle ${paddle} isn't verified to bid on Lot #${lot.itemNumber}`, 403);
    }

    const { result } = await settleBid({
        mode: "FLOOR",
        lot,
        lotUuid,
        userId,
        amount,
        ip,
        userAgent,
        errors: { ...ENGINE_ERRORS, ALREADY_LEADING: () => [`Paddle ${paddle} is already the highest bidder`, 409] },
    });
    const money = (value) => formatMoney(value, lot.currencyCode);

    return {
        message: result.leading
            ? `Floor bid of ${money(amount)} for paddle ${paddle} is the highest bid`
            : `Floor bid of ${money(amount)} for paddle ${paddle} was topped by a proxy bid — the bid is now ${money(result.currentBid)}`,
        data: result,
    };
};

// =====================================================================
// HAMMER: PLACE THE PROXIES (auctioneer console)
// Proxies don't bid while the lot is live. When the auctioneer clicks Sell,
// they're placed against the standing bid — only the highest bids, taking the lead
// at the next valid bid up to its max (equal maximums: the one set first) — and
// broadcast like any bid. The console then counts down and the auctioneer
// confirms the sale (POST /api/auction/lots/:lotUuid/hammer).
// =====================================================================

export const executeProxiesService = async ({ lotUuid }) => {
    const lot = await ensureLotState(lotUuid);
    if (lot.status !== "ACTIVE") throw httpError(`Lot #${lot.itemNumber} isn't live`, 409);

    const run = async () => {
        await ensureAuctionStatus(lot.auctionUuid);
        return runBidEngine({ mode: "EXECUTE", lotUuid, auctionUuid: lot.auctionUuid });
    };
    let result = await run();
    if (result.err === "NOT_LOADED") {
        await ensureLotState(lotUuid);
        result = await run();
    }
    if (result.err) {
        const [message, status] = (ENGINE_ERRORS[result.err] ?? (() => ["Could not place the proxy bids", 409]))(lot, result);
        throw httpError(message, status);
    }

    const merged = { ...lot, ...result.state };
    if (result.bids.length > 0) await broadcastLot(lotUuid, merged, result);

    const view = liveView(lotUuid, merged);
    const bidders = await biddersById(lot.auctionUuid, lot.auctionId, [view.leaderId]);
    const leader = view.leaderId ? bidders.get(String(view.leaderId)) ?? null : null;
    const proxyCount = await redis.hlen(bidKeys.proxies(lotUuid));
    const money = (value) => formatMoney(value, lot.currencyCode);
    const who = leader?.paddle ? `Paddle #${leader.paddle}` : leader?.name ?? "the top bidder";

    let message;
    if (result.bids.length > 0) message = `Proxy bid placed — ${who} leads at ${money(view.currentBid)}`;
    else if (proxyCount === 0) message = "No proxy bids on this lot";
    else if (view.currentBid !== null) message = `No proxy bid beats ${money(view.currentBid)} — ${who} keeps the lead`;
    else message = "No proxy bid reaches the starting price";

    return {
        message,
        data: {
            lotUuid,
            proxyCount,
            proxyBidsPlaced: result.bids.length,
            currentBid: view.currentBid,
            bidCount: view.bidCount,
            leader,
        },
    };
};

// =====================================================================
// MY STANDING ON A LOT (bid dialog)
// =====================================================================

export const getMyLotStandingService = async ({ lotUuid, userId }) => {
    if (!userId) throw httpError("Authenticated user is required", 401);
    const user = BigInt(userId);

    const lot = await prisma.auctionItem.findUnique({
        where: { uuid: lotUuid },
        select: {
            id: true,
            itemNumber: true,
            title: true,
            status: true,
            startingPrice: true,
            currentBid: true,
            currentBidderId: true,
            bidCount: true,
            currency: { select: { code: true, symbol: true } },
            bidders: {
                where: { userId: user },
                select: {
                    status: true,
                    user: { select: { status: true, role: { select: { name: true } }, kyc: { select: { status: true } } } },
                },
            },
            auction: {
                select: {
                    id: true,
                    uuid: true,
                    status: true,
                    deletedAt: true,
                    proxyBiddingEnabled: true,
                    currency: { select: { code: true, symbol: true } },
                    participants: { where: { userId: user }, select: { paddleNumber: true } },
                },
            },
        },
    });
    if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);

    const participant = lot.auction.participants[0] ?? null;
    const registration = lot.bidders[0]?.status ?? (participant ? "PENDING" : "NOT_REGISTERED");

    const auctionStatus = lot.auction.status;
    const biddingOpen = BIDDING_AUCTION_STATUSES.includes(auctionStatus);
    const state = biddingOpen ? await ensureLotState(lotUuid) : await readLotState(lotUuid);

    let position;
    if (state) {
        const view = liveView(lotUuid, state);
        const proxy = await redis.hget(bidKeys.proxies(lotUuid), String(userId));
        position = {
            currentBid: view.currentBid,
            bidCount: view.bidCount,
            nextBid: biddingOpen ? view.nextBid : null,
            bidOptions: biddingOpen ? bidOptions(view.nextBid, JSON.parse(state.rules || "[]")).map(String) : [],
            leading: view.leaderId === String(userId),
            proxyMax: proxy ? String(JSON.parse(proxy).max) : null,
        };
    } else {
        const count = Number(lot.bidCount);
        position = {
            currentBid: count > 0 && lot.currentBid !== null ? lot.currentBid.toString() : null,
            bidCount: String(count),
            nextBid: null,
            bidOptions: [],
            leading: count > 0 && lot.currentBidderId === user,
            proxyMax: null,
        };
    }

    const bidder = lot.bidders[0]?.user;
    const verified =
        registration === "VERIFIED" &&
        bidder?.status === "ACTIVE" &&
        bidder?.role.name === "BIDDER" &&
        bidder?.kyc?.status === "VERIFIED";
    return serializeBigInt({
        lotUuid,
        itemNumber: lot.itemNumber,
        title: lot.title,
        status: lot.status,
        auctionStatus,
        currency: lot.currency ?? lot.auction.currency,
        registration,
        paddleNumber: participant?.paddleNumber ?? null,
        ...position,
        canBid: verified && lot.status === "ACTIVE" && auctionStatus === "LIVE",
        // staff can switch proxy bids off per auction
        proxyEnabled: lot.auction.proxyBiddingEnabled,
        // left or changed until the lot opens
        canProxy: verified && biddingOpen && lot.auction.proxyBiddingEnabled && PROXY_LOT_STATUSES.includes(lot.status),
    });
};

// =====================================================================
// LIVE READS FOR THE REST API (storefront + dashboard)
// =====================================================================

/**
 * Lots with live state get their current bid and bid count from Redis (the
 * database copy can be up to one scheduler tick behind). Never fails the read.
 */
export const overlayLiveBids = async (lots) => {
    if (lots.length === 0) return lots;
    try {
        const pipe = redis.pipeline();
        for (const lot of lots) pipe.hmget(bidKeys.lot(lot.uuid), "bidCount", "currentBid");
        const rows = await pipe.exec();

        return lots.map((lot, index) => {
            const [error, values] = rows[index];
            const count = error ? 0 : Number(values?.[0]) || 0;
            if (count === 0) return lot;
            return { ...lot, bidCount: BigInt(count), currentBid: String(values[1]) };
        });
    } catch (error) {
        console.error("[bidding] live overlay failed, serving saved bids:", error);
        return lots;
    }
};

/** One lot's live position + the top of its ladder (every bid when ladderSize is null); null when it has no live state. */
export const getLiveLotView = async (lotUuid, ladderSize) => {
    try {
        const [[, state], [, rawBids]] = await redis
            .pipeline()
            .hgetall(bidKeys.lot(lotUuid))
            .lrange(bidKeys.bids(lotUuid), ladderSize ? -ladderSize : 0, -1)
            .exec();
        if (!state || Object.keys(state).length === 0) return null;

        const { leaderId, ...view } = liveView(lotUuid, state);
        const leader = leaderId ? await redis.hget(bidKeys.auctionBidders(state.auctionUuid), leaderId) : null;
        return {
            ...view,
            leadingPaddle: leader ? JSON.parse(leader).paddle : null,
            bids: rawBids
                .map((raw) => JSON.parse(raw))
                .reverse()
                .map((bid) => toPublicBid(lotUuid, bid)),
        };
    } catch (error) {
        console.error(`[bidding] live view failed for lot ${lotUuid}:`, error);
        return null;
    }
};

// =====================================================================
// DASHBOARD ACTIVITY (initial load; bid:new keeps it current)
// =====================================================================

const FEED_PAGE = 50;
const RECENT_WINDOW_MS = 5 * 60 * 1000;

export const getAuctionActivityService = async ({ auctionUuid }) => {
    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: { id: true, uuid: true, title: true, status: true, deletedAt: true, currency: { select: { code: true, symbol: true } } },
    });
    if (!auction || auction.deletedAt) throw httpError("Auction not found", 404);

    const [[, rawFeed], [, topRaw], [, lotUuids]] = await redis
        .pipeline()
        .lrange(bidKeys.auctionFeed(auctionUuid), 0, -1)
        .zrevrange(bidKeys.auctionCounts(auctionUuid), 0, 9, "WITHSCORES")
        .smembers(bidKeys.auctionLots(auctionUuid))
        .exec();

    // every lot's position + its proxies
    const pipe = redis.pipeline();
    for (const lotUuid of lotUuids) {
        pipe.hmget(bidKeys.lot(lotUuid), "itemNumber", "title", "currentBid", "bidCount", "leaderId", "currencyCode", "currencySymbol");
        pipe.hgetall(bidKeys.proxies(lotUuid));
    }
    const lotRows = lotUuids.length ? await pipe.exec() : [];

    const lots = new Map();
    const proxies = [];
    lotUuids.forEach((lotUuid, index) => {
        const [itemNumber, title, currentBid, bidCount, leaderId, code, symbol] = lotRows[index * 2][1] ?? [];
        const count = Number(bidCount) || 0;
        lots.set(lotUuid, { itemNumber, title, currentBid: count > 0 ? Number(currentBid) : null, leaderId });

        for (const [userId, raw] of Object.entries(lotRows[index * 2 + 1][1] ?? {})) {
            const { max, at } = JSON.parse(raw);
            // still in play: can top the current bid, or is leading
            const inPlay = count === 0 || max > Number(currentBid) || userId === leaderId;
            if (!inPlay) continue;
            proxies.push({
                lotUuid,
                itemNumber: String(itemNumber),
                title,
                userId,
                maxAmount: String(max),
                currency: { code, symbol: symbol || null },
                placedAt: new Date(at).toISOString(),
                leading: count > 0 && userId === leaderId,
            });
        }
    });

    const feed = rawFeed.map((raw) => JSON.parse(raw));
    const top = [];
    for (let i = 0; i < topRaw.length; i += 2) top.push({ userId: topRaw[i], bids: Number(topRaw[i + 1]) });

    const bidders = await biddersById(auctionUuid, auction.id, [
        ...feed.map((bid) => bid.u),
        ...top.map((row) => row.userId),
        ...proxies.map((proxy) => proxy.userId),
    ]);
    const bidderOf = (userId) => bidders.get(String(userId)) ?? null;

    const since = Date.now() - RECENT_WINDOW_MS;
    const stats = await readStats(auctionUuid);

    return serializeBigInt({
        auction: { uuid: auction.uuid, title: auction.title, status: auction.status, currency: auction.currency },
        stats: {
            ...stats,
            // the feed holds the last FEED_SIZE bids, which covers any realistic 5 minutes
            recentBids: feed.filter((bid) => bid.t >= since).length,
            proxiesInPlay: proxies.length,
        },
        feed: feed.slice(0, FEED_PAGE).map((bid) => ({
            ...toPublicBid(bid.lot, bid),
            lotUuid: bid.lot,
            itemNumber: String(bid.n),
            title: lots.get(bid.lot)?.title ?? null,
            bidder: bidderOf(bid.u),
        })),
        topBidders: top.map(({ userId, bids }) => ({ bidder: bidderOf(userId), bids })),
        proxies: proxies
            .sort((a, b) => Number(b.maxAmount) - Number(a.maxAmount))
            .map(({ userId, ...proxy }) => ({ ...proxy, bidder: bidderOf(userId) })),
    });
};

// =====================================================================
// AUCTIONEER CONSOLE (the sale's live lot; bid:new keeps it current)
// =====================================================================

/** Bids shown in the console's log */
const CONSOLE_LADDER = 100;

/** Lots the auctioneer can open next (mirrors STARTABLE_LOT_STATUSES in liveAuction.services.js) */
const NEXT_LOT_STATUSES = ["DRAFT", "SCHEDULED"];
const CLOSED_LOT_STATUSES = ["SOLD", "UNSOLD", "PASSED", "WITHDRAWN"];

const byPaddle = (a, b) => (Number(a.paddle) || 0) - (Number(b.paddle) || 0);

export const getAuctionConsoleService = async ({ auctionUuid }) => {
    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: {
            id: true,
            uuid: true,
            title: true,
            status: true,
            auctionType: true,
            deletedAt: true,
            currency: { select: { code: true, symbol: true } },
            category: { select: { name: true } },
            auctionFees: {
                where: { feeType: "BUYER_PREMIUM", isActive: true },
                orderBy: { sortOrder: "asc" },
                select: { name: true, calculationType: true, value: true },
            },
            items: { orderBy: { itemNumber: "asc" }, select: { uuid: true, itemNumber: true, title: true, status: true } },
        },
    });
    if (!auction || auction.deletedAt) throw httpError("Auction not found", 404);

    const { items } = auction;
    const live = items.find((lot) => lot.status === "ACTIVE");
    // first lot not yet offered, else the first one that got no bids (re-offer)
    const next = items.find((lot) => NEXT_LOT_STATUSES.includes(lot.status)) ?? items.find((lot) => lot.status === "UNSOLD");

    const base = {
        auction: {
            uuid: auction.uuid,
            title: auction.title,
            status: auction.status,
            auctionType: auction.auctionType,
            currency: auction.currency,
            lotCount: items.length,
            closedLots: items.filter((lot) => CLOSED_LOT_STATUSES.includes(lot.status)).length,
        },
        buyerPremium: auction.auctionFees,
        nextLot: next ? { uuid: next.uuid, itemNumber: next.itemNumber, title: next.title, status: next.status } : null,
        lot: null,
        position: null,
        bids: [],
        floorBidders: [],
        proxyBook: { count: 0, topMax: null },
    };
    if (!live) return serializeBigInt(base);

    const lotUuid = live.uuid;
    const lot = await prisma.auctionItem.findUnique({
        where: { uuid: lotUuid },
        select: {
            id: true,
            uuid: true,
            itemNumber: true,
            title: true,
            artistName: true,
            medium: true,
            yearCreated: true,
            status: true,
            startingPrice: true,
            reservePrice: true,
            estimateLow: true,
            estimateHigh: true,
            currency: { select: { code: true, symbol: true } },
            category: { select: { name: true } },
            images: {
                where: { mediaType: "IMAGE" },
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                take: 1,
                select: { url: true, thumbnailUrl: true },
            },
        },
    });

    const biddingOpen = BIDDING_AUCTION_STATUSES.includes(auction.status);
    const state = biddingOpen ? await ensureLotState(lotUuid) : await readLotState(lotUuid);
    const [rawBids, rawProxies] = state
        ? await Promise.all([redis.lrange(bidKeys.bids(lotUuid), -CONSOLE_LADDER, -1), redis.hgetall(bidKeys.proxies(lotUuid))])
        : [[], {}];
    const ladder = rawBids.map((raw) => JSON.parse(raw)).reverse(); // newest first
    // proxies waiting for the hammer: the console places them when the auctioneer clicks Sell
    const proxyMaxes = Object.values(rawProxies).map((raw) => Number(JSON.parse(raw).max));
    const proxyBook = { count: proxyMaxes.length, topMax: proxyMaxes.length ? String(Math.max(...proxyMaxes)) : null };

    let position;
    if (state) {
        const view = liveView(lotUuid, state);
        position = {
            currentBid: view.currentBid,
            bidCount: view.bidCount,
            nextBid: view.nextBid,
            bidOptions: auction.status === "LIVE" ? bidOptions(view.nextBid, JSON.parse(state.rules || "[]")).map(String) : [],
            leaderId: view.leaderId,
        };
    } else {
        position = { currentBid: null, bidCount: "0", nextBid: String(lot.startingPrice), bidOptions: [], leaderId: null };
    }

    const bidders = await biddersById(auctionUuid, auction.id, [position.leaderId, ...ladder.map((bid) => bid.u)]);
    const { leaderId, ...openPosition } = position;
    const top = ladder[0];
    const reserve = lot.reservePrice === null ? null : Number(lot.reservePrice);

    // paddles the auctioneer can enter floor bids for
    let floorBidders = [];
    if (auction.auctionType !== "LIVE") {
        const rows = await prisma.lotBidder.findMany({
            where: { itemId: lot.id, ...ELIGIBLE_LOT_BIDDER_WHERE },
            select: {
                user: {
                    select: {
                        uuid: true,
                        username: true,
                        profile: { select: { displayName: true, firstName: true, lastName: true } },
                        auctionParticipations: { where: { auctionId: auction.id }, select: { paddleNumber: true } },
                    },
                },
            },
        });
        floorBidders = rows
            .map(({ user }) => ({ uuid: user.uuid, paddle: user.auctionParticipations[0]?.paddleNumber ?? null, name: displayName(user) }))
            .filter((bidder) => bidder.paddle)
            .sort(byPaddle);
    }

    const { images, category, id, ...lotFields } = lot; // eslint-disable-line no-unused-vars
    return serializeBigInt({
        ...base,
        lot: {
            ...lotFields,
            category: category?.name ?? auction.category?.name ?? null,
            imageUrl: images[0]?.url ?? null,
            currency: lot.currency ?? auction.currency,
        },
        position: {
            ...openPosition,
            reserveMet: openPosition.currentBid !== null && (reserve === null || Number(openPosition.currentBid) >= reserve),
            leader:
                leaderId && top
                    ? { ...(bidders.get(String(leaderId)) ?? { uuid: null, paddle: null, name: null }), source: toPublicBid(lotUuid, top).source }
                    : null,
        },
        bids: ladder.map((bid) => ({ ...toPublicBid(lotUuid, bid), bidder: bidders.get(String(bid.u)) ?? null })),
        floorBidders,
        proxyBook,
    });
};

// =====================================================================
// DASHBOARD HOME (every running sale at a glance — Redis only)
// =====================================================================

/**
 * For each running sale ({ id, uuid, liveLotUuid }): bid totals, the live lot's
 * current position, and its latest `feedSize` bids, each with the bidder and
 * whether it still leads its lot. Returns a Map keyed by auction uuid.
 */
export const getSalesBidSnapshot = async (auctions, { feedSize = 10 } = {}) => {
    const result = new Map();
    if (auctions.length === 0) return result;

    const feedPipe = redis.pipeline();
    for (const { uuid } of auctions) feedPipe.lrange(bidKeys.auctionFeed(uuid), 0, feedSize - 1);
    const feeds = (await feedPipe.exec()).map(([, raw]) => (raw ?? []).map((bid) => JSON.parse(bid)));

    // where each lot stands now (lots in the feeds + each sale's live lot)
    const lotUuids = [
        ...new Set([...feeds.flat().map((bid) => bid.lot), ...auctions.map((a) => a.liveLotUuid).filter(Boolean)]),
    ];
    const lotPipe = redis.pipeline();
    for (const lotUuid of lotUuids) {
        lotPipe.hmget(bidKeys.lot(lotUuid), "currentBid", "bidCount", "leaderId", "title", "currencyCode", "currencySymbol");
    }
    const lotRows = lotUuids.length ? await lotPipe.exec() : [];
    const lots = new Map(
        lotUuids.map((lotUuid, index) => {
            const [currentBid, bidCount, leaderId, title, code, symbol] = lotRows[index][1] ?? [];
            const count = Number(bidCount) || 0;
            return [
                lotUuid,
                {
                    currentBid: count > 0 ? Number(currentBid) : null,
                    bidCount: count,
                    leaderId,
                    title,
                    currency: code ? { code, symbol: symbol || null } : null,
                },
            ];
        })
    );

    await Promise.all(
        auctions.map(async ({ id, uuid, liveLotUuid }, index) => {
            const feed = feeds[index];
            const [stats, bidders] = await Promise.all([
                readStats(uuid),
                biddersById(uuid, id, feed.map((bid) => bid.u)),
            ]);
            const live = liveLotUuid ? lots.get(liveLotUuid) : null;

            result.set(uuid, {
                stats,
                liveLot: live && live.bidCount > 0 ? { currentBid: live.currentBid, bidCount: live.bidCount } : null,
                bids: feed.map((bid) => {
                    const lot = lots.get(bid.lot);
                    return {
                        ...toPublicBid(bid.lot, bid),
                        lotUuid: bid.lot,
                        itemNumber: String(bid.n),
                        title: lot?.title ?? null,
                        currency: lot?.currency ?? null,
                        bidder: bidders.get(String(bid.u)) ?? null,
                        leading: !!lot && String(lot.leaderId) === String(bid.u) && lot.currentBid === Number(bid.a),
                    };
                }),
            });
        })
    );

    return result;
};

// =====================================================================
// DASHBOARD BID HISTORY
// =====================================================================

/**
 * Every bid still held in Redis for these lots (running sales, or an ended
 * sale whose bids aren't written yet), oldest first, as a Map keyed by lot
 * uuid. Lots without bids here are left out — read the bids table for them.
 */
export const readLiveLotBids = async (lotUuids) => {
    const result = new Map();
    if (lotUuids.length === 0) return result;

    const pipe = redis.pipeline();
    for (const lotUuid of lotUuids) pipe.lrange(bidKeys.bids(lotUuid), 0, -1);
    const rows = await pipe.exec();

    lotUuids.forEach((lotUuid, index) => {
        const [error, raw] = rows[index];
        if (error || !raw?.length) return;
        result.set(
            lotUuid,
            raw.map((entry) => {
                const bid = JSON.parse(entry);
                return { ...toPublicBid(lotUuid, bid), seq: Number(bid.seq), userId: String(bid.u) };
            })
        );
    });
    return result;
};

// =====================================================================
// LOT + AUCTION LIFECYCLE
// =====================================================================

/**
 * Stops bids on a lot that is about to close and returns its final position
 * (null when it never had live state). Call inside the closing transaction;
 * if that transaction fails, call syncLotBidding / syncAuctionBidding to reopen.
 */
export const freezeLotBidding = async (lotUuid) => {
    const key = bidKeys.lot(lotUuid);
    const before = await readLotState(lotUuid);
    if (!before) return null;

    // the proxies are placed and bids stopped in one atomic run, so a lot closed any way
    // (hammer, stop, auction end) still goes to its highest proxy — a no-op when the
    // hammer already placed them and nothing came in since
    let closed = false;
    try {
        await ensureAuctionStatus(before.auctionUuid);
        const result = await runBidEngine({ mode: "CLOSE", lotUuid, auctionUuid: before.auctionUuid });
        if (result.ok) {
            closed = true;
            if (result.bids.length > 0) await broadcastLot(lotUuid, { ...before, ...result.state }, result);
        }
    } catch (error) {
        console.error(`[bidding] could not place proxies on lot ${lotUuid} before closing:`, error);
    }
    if (!closed) await redis.hset(key, "status", "CLOSING");

    const state = await redis.hgetall(key);
    const count = Number(state.bidCount) || 0;
    return {
        bidCount: BigInt(count),
        currentBid: count > 0 ? String(state.currentBid) : null,
        currentBidderId: count > 0 && state.leaderId ? BigInt(state.leaderId) : null,
    };
};

/**
 * Brings a lot's live state in line with the database (after it starts, stops,
 * or a failed close) and broadcasts. Proxies wait for the hammer (executeProxiesService).
 */
export const syncLotBidding = async (lotUuid) => {
    const lot = await loadLotSource(lotUuid);
    const auctionUuid = lot.auction.uuid;

    const hasState = (await redis.exists(bidKeys.lot(lotUuid))) === 1;
    if (!hasState && (lot.status !== "ACTIVE" || !BIDDING_AUCTION_STATUSES.includes(lot.auction.status))) {
        emitTo(rooms.auction(auctionUuid), "lot:update", {
            auctionUuid,
            lotUuid,
            itemNumber: lot.itemNumber.toString(),
            status: lot.status,
        });
        return;
    }

    await setAuctionStatusCache(auctionUuid, lot.auction.status);
    const fields = staticFields(lot);
    const created = await hydrateLotState({ lotUuid, auctionUuid, fields: { ...fields, ...savedPosition(lot) } });
    // existing state keeps its bids; only the lot facts are refreshed
    if (created) await restoreProxies(lotUuid, lot.id);
    else await redis.hset(bidKeys.lot(lotUuid), fields);

    const state = await readLotState(lotUuid);
    const result = await runBidEngine({ mode: "RESOLVE", lotUuid, auctionUuid });
    await broadcastLot(lotUuid, result.ok ? { ...state, ...result.state } : state, result.ok ? result : null);
};

/**
 * Call after an auction's status changes (manually or by the scheduler):
 * refreshes the cached status, reopens its live lot (proxies still wait for the hammer on
 * resume), and once the sale is over writes its bids to the database.
 */
export const syncAuctionBidding = async (auctionUuid) => {
    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: { status: true, items: { where: { status: "ACTIVE" }, select: { uuid: true } } },
    });
    if (!auction) return;

    await setAuctionStatusCache(auctionUuid, auction.status);

    if (FINISHED_AUCTION_STATUSES.includes(auction.status)) {
        // closed lots that were bid on show their result before the keys go
        const lotUuids = await redis.smembers(bidKeys.auctionLots(auctionUuid));
        for (const lotUuid of lotUuids) {
            await syncLotBidding(lotUuid).catch((error) => console.error(`[bidding] could not close lot ${lotUuid}:`, error));
        }
        emitTo(rooms.auction(auctionUuid), "auction:status", { auctionUuid, status: auction.status });
        await redis.sadd(bidKeys.flushPending, auctionUuid);
        await flushAuctionBids(auctionUuid);
        return;
    }

    for (const { uuid } of auction.items) await syncLotBidding(uuid);
    emitTo(rooms.auction(auctionUuid), "auction:status", { auctionUuid, status: auction.status });
};

// =====================================================================
// WRITING TO THE DATABASE
// =====================================================================

/** Final status of each bid once the lot's result is known */
const finalBidStatus = ({ isTop, lotStatus, auctionStatus }) => {
    if (auctionStatus === "CANCELLED") return "CANCELLED";
    if (!isTop) return "OUTBID";
    return lotStatus === "SOLD" ? "WON" : "LOST";
};

const persistLot = async ({ state, rawBids, rawProxies, auctionStatus }) => {
    const itemId = BigInt(state.lotId);
    const bids = rawBids.map((raw) => JSON.parse(raw));
    const count = Number(state.bidCount) || 0;

    await prisma.$transaction(
        async (tx) => {
            const item = await tx.auctionItem.findUnique({
                where: { id: itemId },
                select: { status: true, _count: { select: { bids: true } } },
            });
            if (!item) return;

            // bids are only ever written here, all at once — any rows mean an earlier flush got this far
            if (bids.length > 0 && item._count.bids === 0) {
                const last = bids.length - 1;
                await tx.bid.createMany({
                    data: bids.map((bid, index) => ({
                        uuid: randomUUID(),
                        itemId,
                        bidderId: BigInt(bid.u),
                        amount: String(bid.a),
                        source: BID_SOURCES[bid.s] ?? "PROXY",
                        status: finalBidStatus({ isTop: index === last, lotStatus: item.status, auctionStatus }),
                        ipAddress: bid.ip || null,
                        userAgent: bid.ua || null,
                        placedAt: new Date(bid.t),
                        createdAt: new Date(bid.t),
                    })),
                });

                // a sold lot's winner row was written at the hammer, before its bids existed here
                if (item.status === "SOLD") {
                    const winning = await tx.bid.findFirst({ where: { itemId, status: "WON" }, select: { id: true } });
                    if (winning) {
                        await tx.auctionWinner.updateMany({
                            where: { itemId, winningBidId: null },
                            data: { winningBidId: winning.id },
                        });
                    }
                }
            } else if (item._count.bids > 0 && auctionStatus === "CANCELLED") {
                // saved when the lot closed (saveClosedLotBids), before the sale was called off
                await tx.bid.updateMany({ where: { itemId }, data: { status: "CANCELLED" } });
            }

            // proxies are saved when they're set — this only catches any left before that (older Redis state)
            const proxies = Object.entries(rawProxies);
            if (proxies.length > 0) {
                await tx.autoBid.createMany({
                    data: proxies.map(([userId, raw]) => {
                        const { max, at } = JSON.parse(raw);
                        return { itemId, bidderId: BigInt(userId), maxAmount: String(max), isActive: false, createdAt: new Date(at) };
                    }),
                    skipDuplicates: true,
                });
            }

            if (count > 0) {
                await tx.auctionItem.update({
                    where: { id: itemId },
                    data: {
                        currentBid: String(state.currentBid),
                        currentBidderId: state.leaderId ? BigInt(state.leaderId) : null,
                        bidCount: BigInt(count),
                    },
                });
            }
        },
        { maxWait: 10_000, timeout: 60_000 }
    );
};

/**
 * Writes a lot's bids to the database as soon as it closes (hammer / stop), so
 * its history doesn't depend on Redis for the rest of the sale. Its Redis keys
 * stay until the auction ends (flushAuctionBids skips lots already written).
 * Never fails the close — the flush at the end of the sale writes them anyway.
 */
export const saveClosedLotBids = async (lotUuid) => {
    try {
        const [[, state], [, rawBids]] = await redis
            .pipeline()
            .hgetall(bidKeys.lot(lotUuid))
            .lrange(bidKeys.bids(lotUuid), 0, -1)
            .exec();
        if (!state || Object.keys(state).length === 0 || rawBids.length === 0) return;

        const lot = await prisma.auctionItem.findUnique({
            where: { uuid: lotUuid },
            select: { status: true, auction: { select: { status: true } } },
        });
        if (!lot || !CLOSED_LOT_STATUSES.includes(lot.status)) return;

        await persistLot({ state, rawBids, rawProxies: {}, auctionStatus: lot.auction.status });
    } catch (error) {
        console.error(`[bidding] could not save the bids of closed lot ${lotUuid} (saved when the sale ends):`, error);
    }
};

/**
 * Writes a finished auction's bids and proxy bids to the database, then drops
 * its Redis keys. Safe to run again after a failure (flushPendingAuctions retries).
 */
export const flushAuctionBids = async (auctionUuid) => {
    const auction = await prisma.auction.findUnique({ where: { uuid: auctionUuid }, select: { status: true } });
    if (!auction || !FINISHED_AUCTION_STATUSES.includes(auction.status)) {
        // reopened (e.g. cancelled → draft) or gone — nothing to flush
        await redis.srem(bidKeys.flushPending, auctionUuid);
        return { lots: 0, bids: 0 };
    }

    const lotUuids = await redis.smembers(bidKeys.auctionLots(auctionUuid));
    let bidTotal = 0;

    for (const lotUuid of lotUuids) {
        const [[, state], [, rawBids], [, rawProxies]] = await redis
            .pipeline()
            .hgetall(bidKeys.lot(lotUuid))
            .lrange(bidKeys.bids(lotUuid), 0, -1)
            .hgetall(bidKeys.proxies(lotUuid))
            .exec();

        if (state && Object.keys(state).length > 0) {
            await persistLot({ state, rawBids, rawProxies, auctionStatus: auction.status });
            bidTotal += rawBids.length;
        }
        await redis.del(...lotKeyList(lotUuid));
        await redis.srem(bidKeys.dirty, lotUuid);
    }

    // the sale is over: its proxies won't bid again (every lot, including any Redis never loaded)
    await prisma.autoBid.updateMany({ where: { item: { auction: { uuid: auctionUuid } }, isActive: true }, data: { isActive: false } });

    await redis.del(...auctionKeyList(auctionUuid));
    await redis.srem(bidKeys.flushPending, auctionUuid);

    if (lotUuids.length > 0) {
        console.info(`[bidding] saved ${bidTotal} bid(s) on ${lotUuids.length} lot(s) of auction ${auctionUuid}`);
    }
    return { lots: lotUuids.length, bids: bidTotal };
};

/** Scheduler: retries flushes that failed (e.g. the database was briefly down). */
export const flushPendingAuctions = async () => {
    const pending = await redis.smembers(bidKeys.flushPending);
    for (const auctionUuid of pending) {
        try {
            await flushAuctionBids(auctionUuid);
        } catch (error) {
            console.error(`[bidding] flush failed for auction ${auctionUuid} (will retry):`, error);
        }
    }
};

const SNAPSHOT_BATCH = 500;

/**
 * Scheduler: copies the current bid / bid count / leader of lots that changed
 * since the last tick into the database — one update per lot, however many bids.
 */
export const syncDirtyLots = async () => {
    const lotUuids = await redis.spop(bidKeys.dirty, SNAPSHOT_BATCH);
    if (!lotUuids?.length) return 0;

    const pipe = redis.pipeline();
    for (const lotUuid of lotUuids) pipe.hmget(bidKeys.lot(lotUuid), "lotId", "currentBid", "leaderId", "bidCount");
    const rows = await pipe.exec();

    const failed = [];
    for (const [index, [error, values]] of rows.entries()) {
        const [lotId, currentBid, leaderId, bidCount] = values ?? [];
        const count = Number(bidCount) || 0;
        if (error || !lotId || count === 0) continue;
        try {
            await prisma.auctionItem.updateMany({
                where: { id: BigInt(lotId) },
                data: {
                    currentBid: String(currentBid),
                    currentBidderId: leaderId ? BigInt(leaderId) : null,
                    bidCount: BigInt(count),
                },
            });
        } catch (updateError) {
            console.error(`[bidding] snapshot failed for lot ${lotUuids[index]}:`, updateError);
            failed.push(lotUuids[index]);
        }
    }
    if (failed.length) await redis.sadd(bidKeys.dirty, ...failed);
    return lotUuids.length;
};
