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
import { nextValidBid } from "../utils/bidIncrement.js";
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
//   - once the auction ends, every bid and proxy is written to the bids /
//     auto_bids tables and the Redis keys are dropped (flushAuctionBids)
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

/** Lots that can still take a proxy bid */
const PROXY_LOT_STATUSES = ["ACTIVE", "DRAFT", "SCHEDULED"];

const BLOCKED_USER_STATUSES = ["SUSPENDED", "BANNED", "DEACTIVATED"];

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

/** The lot's live state, loaded from the database the first time it's needed. */
const ensureLotState = async (lotUuid) => {
    const existing = await readLotState(lotUuid);
    if (existing) return existing;

    const lot = await loadLotSource(lotUuid);
    if (!BIDDING_AUCTION_STATUSES.includes(lot.auction.status)) {
        throw httpError("Bidding is closed for this auction", 409);
    }

    await hydrateLotState({
        lotUuid,
        auctionUuid: lot.auction.uuid,
        fields: { ...staticFields(lot), ...savedPosition(lot) },
    });
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
        where: {
            itemId: BigInt(lotId),
            status: "VERIFIED",
            user: { deletedAt: null, status: { notIn: BLOCKED_USER_STATUSES } },
        },
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
    const row = await prisma.lotBidder.findUnique({
        where: { itemId_userId: { itemId: BigInt(lotId), userId: BigInt(userId) } },
        select: { status: true },
    });
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
    source: bid.s === "M" ? "MANUAL" : "PROXY",
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
    PROXY_NOT_HIGHER: (lot, r) => [
        `Your maximum bid is already ${formatMoney(r.proxyMax, lot.currencyCode)}. Enter a higher amount to raise it.`,
        400,
    ],
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
        const [message, status] = (ENGINE_ERRORS[result.err] ?? (() => ["Could not place the bid", 409]))(lot, result);
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
            bidsPlaced: result.bids.length,
        },
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

export const setProxyBidService = async ({ lotUuid, userId, maxAmount, ip, userAgent }) => {
    const { lot, result } = await runForUser({ mode: "PROXY", lotUuid, userId, amount: maxAmount, ip, userAgent });
    const money = (value) => formatMoney(value, lot.currencyCode);
    const max = money(maxAmount);

    let message;
    if (result.status !== "ACTIVE") message = `Your maximum bid of ${max} is set. It bids for you when Lot #${result.itemNumber} opens.`;
    else if (result.leading) message = `Your maximum bid of ${max} is set — you're the highest bidder at ${money(result.currentBid)}`;
    else message = `Your maximum bid of ${max} was topped by another bidder — the bid is now ${money(result.currentBid)}`;

    return { message, data: result };
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
            bidders: { where: { userId: user }, select: { status: true } },
            auction: {
                select: {
                    id: true,
                    uuid: true,
                    status: true,
                    deletedAt: true,
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
            leading: view.leaderId === String(userId),
            proxyMax: proxy ? String(JSON.parse(proxy).max) : null,
        };
    } else {
        const count = Number(lot.bidCount);
        position = {
            currentBid: count > 0 && lot.currentBid !== null ? lot.currentBid.toString() : null,
            bidCount: String(count),
            nextBid: null,
            leading: count > 0 && lot.currentBidderId === user,
            proxyMax: null,
        };
    }

    const verified = registration === "VERIFIED";
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
        canProxy: verified && biddingOpen && PROXY_LOT_STATUSES.includes(lot.status),
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

/** One lot's live position + the top of its ladder; null when it has no live state. */
export const getLiveLotView = async (lotUuid, ladderSize) => {
    try {
        const [[, state], [, rawBids]] = await redis
            .pipeline()
            .hgetall(bidKeys.lot(lotUuid))
            .lrange(bidKeys.bids(lotUuid), -ladderSize, -1)
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
// LOT + AUCTION LIFECYCLE
// =====================================================================

/**
 * Stops bids on a lot that is about to close and returns its final position
 * (null when it never had live state). Call inside the closing transaction;
 * if that transaction fails, call syncLotBidding / syncAuctionBidding to reopen.
 */
export const freezeLotBidding = async (lotUuid) => {
    const key = bidKeys.lot(lotUuid);
    if (!(await redis.exists(key))) return null;

    await redis.hset(key, "status", "CLOSING");
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
 * or a failed close), lets waiting proxies bid if it's live, and broadcasts.
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
    if (!created) await redis.hset(bidKeys.lot(lotUuid), fields);

    const state = await readLotState(lotUuid);
    const result = await runBidEngine({ mode: "RESOLVE", lotUuid, auctionUuid });
    await broadcastLot(lotUuid, result.ok ? { ...state, ...result.state } : state, result.ok ? result : null);
};

/**
 * Call after an auction's status changes (manually or by the scheduler):
 * refreshes the cached status, reopens its live lot (waiting proxies bid on
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
                        source: bid.s === "M" ? "MANUAL" : "PROXY",
                        status: finalBidStatus({ isTop: index === last, lotStatus: item.status, auctionStatus }),
                        ipAddress: bid.ip || null,
                        userAgent: bid.ua || null,
                        placedAt: new Date(bid.t),
                        createdAt: new Date(bid.t),
                    })),
                });
            }

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
