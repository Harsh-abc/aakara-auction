import { Prisma } from "@prisma/client";

import prisma from "../libs/prisma.js";
import redis from "../libs/redis.js";
import { bidKeys } from "../libs/biddingStore.js";
import { PROXY_LOT_STATUSES, readLiveLotBids } from "./bidding.services.js";
import { toCsv } from "../utils/csv.js";

// =====================================================================
// Dashboard: every proxy (maximum) bid left on a lot — who set it, the
// most they'll pay, from which IP and device, and how it's doing. Rows come
// from auto_bids (written as each proxy is set); a live lot's position is
// read from Redis, where the sale runs.
// =====================================================================

const EXPORT_MAX_ROWS = 10_000;
const EXPORT_BATCH = 500;

/** Roles that see where a proxy was set from (IP, device) and the bidder's contact details */
const ORIGIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/** Lot statuses behind each stage filter */
const STAGE_LOT_STATUSES = {
    waiting: PROXY_LOT_STATUSES,
    live: ["ACTIVE"],
    closed: ["SOLD", "UNSOLD", "PASSED", "WITHDRAWN"],
};

const displayName = (user) => {
    const p = user?.profile;
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
    return p?.displayName || full || user?.username || null;
};

const buildWhere = ({ search, auctionUuid, stage, ip, userUuid }) => {
    const item = { auction: { deletedAt: null, ...(auctionUuid && { uuid: auctionUuid }) } };
    const where = { item };

    if (stage === "withdrawn") where.withdrawnAt = { not: null };
    else if (stage) {
        where.withdrawnAt = null;
        item.status = { in: STAGE_LOT_STATUSES[stage] };
    }
    if (ip) where.ipAddress = { contains: ip };
    if (userUuid) where.bidder = { uuid: userUuid };

    if (search) {
        const contains = { contains: search, mode: "insensitive" };
        const paddle = search.replace(/^#/, "");
        where.OR = [
            { ipAddress: contains },
            { bidder: { username: contains } },
            { bidder: { email: contains } },
            { bidder: { phone: contains } },
            { bidder: { profile: { is: { OR: [{ firstName: contains }, { lastName: contains }, { displayName: contains }] } } } },
            { item: { title: contains } },
            // paddles are per auction; with no auction picked this matches the paddle in any sale
            {
                bidder: {
                    auctionParticipations: {
                        some: { paddleNumber: paddle, ...(auctionUuid && { auction: { uuid: auctionUuid } }) },
                    },
                },
            },
        ];
        if (/^\d+$/.test(search)) where.OR.push({ item: { itemNumber: BigInt(search) } });
    }
    return where;
};

const PROXY_SELECT = {
    id: true,
    maxAmount: true,
    isActive: true,
    ipAddress: true,
    userAgent: true,
    withdrawnAt: true,
    withdrawnReason: true,
    createdAt: true,
    updatedAt: true,
    bidder: {
        select: {
            id: true,
            uuid: true,
            username: true,
            email: true,
            phone: true,
            status: true,
            role: { select: { name: true } },
            kyc: { select: { status: true } },
            profile: { select: { firstName: true, lastName: true, displayName: true, city: true, country: true } },
        },
    },
    item: {
        select: {
            id: true,
            uuid: true,
            itemNumber: true,
            title: true,
            status: true,
            startingPrice: true,
            reservePrice: true,
            estimateLow: true,
            estimateHigh: true,
            currentBid: true,
            currentBidderId: true,
            bidCount: true,
            scheduledStartAt: true,
            currency: { select: { code: true, symbol: true } },
            winner: { select: { winnerId: true, finalHammerPrice: true } },
            auction: {
                select: {
                    id: true,
                    uuid: true,
                    title: true,
                    status: true,
                    auctionType: true,
                    currency: { select: { code: true, symbol: true } },
                },
            },
        },
    },
};

const ORDER = [{ createdAt: "desc" }, { id: "desc" }];

// ---------------------------------------------------------------------
// what each proxy is doing
// ---------------------------------------------------------------------

/** Where a lot stands: Redis while it has live state there, else the saved copy. */
const readPositions = async (items) => {
    const positions = new Map();
    const unique = [...new Map(items.map((item) => [item.uuid, item])).values()];
    if (unique.length === 0) return positions;

    let live = [];
    try {
        const pipe = redis.pipeline();
        for (const item of unique) pipe.hmget(bidKeys.lot(item.uuid), "currentBid", "bidCount", "leaderId");
        live = await pipe.exec();
    } catch (error) {
        console.error("[proxy-bids] live positions unavailable, using saved ones:", error);
    }

    unique.forEach((item, index) => {
        const [error, values] = live[index] ?? [];
        const liveCount = error ? 0 : Number(values?.[1]) || 0;
        if (liveCount > 0) {
            positions.set(item.uuid, { currentBid: Number(values[0]), bidCount: liveCount, leaderId: values[2] || null });
            return;
        }
        const count = Number(item.bidCount);
        positions.set(item.uuid, {
            currentBid: count > 0 && item.currentBid !== null ? Number(item.currentBid) : null,
            bidCount: count,
            leaderId: count > 0 && item.currentBidderId ? item.currentBidderId.toString() : null,
        });
    });
    return positions;
};

/**
 * Bids each proxy placed for its owner — from Redis while the sale's bids are
 * still there, else from the bids table (written once the sale ends).
 */
const readProxyBidTotals = async (rows) => {
    const totals = new Map();
    if (rows.length === 0) return totals;
    const key = (lotUuid, userId) => `${lotUuid}:${userId}`;

    let live = new Map();
    try {
        live = await readLiveLotBids([...new Set(rows.map((row) => row.item.uuid))]);
    } catch (error) {
        console.error("[proxy-bids] live bids unavailable:", error);
    }
    for (const [lotUuid, bids] of live) {
        for (const bid of bids) {
            if (bid.source !== "PROXY") continue;
            const k = key(lotUuid, bid.userId);
            const total = totals.get(k) ?? { count: 0, highest: null };
            total.count += 1;
            total.highest = Math.max(total.highest ?? 0, Number(bid.amount));
            totals.set(k, total);
        }
    }

    const saved = rows.filter((row) => !live.has(row.item.uuid));
    if (saved.length > 0) {
        const groups = await prisma.bid.groupBy({
            by: ["itemId", "bidderId"],
            where: { source: "PROXY", OR: saved.map((row) => ({ itemId: row.item.id, bidderId: row.bidder.id })) },
            _count: { _all: true },
            _max: { amount: true },
        });
        const lotUuidById = new Map(saved.map((row) => [row.item.id.toString(), row.item.uuid]));
        for (const group of groups) {
            totals.set(key(lotUuidById.get(group.itemId.toString()), group.bidderId.toString()), {
                count: group._count._all,
                highest: group._max.amount === null ? null : Number(group._max.amount),
            });
        }
    }

    for (const row of rows) {
        const k = key(row.item.uuid, row.bidder.id.toString());
        if (!totals.has(k)) totals.set(k, { count: 0, highest: null });
    }
    return totals;
};

/** Paddle of each (auction, bidder) pair */
const readPaddles = async (rows) => {
    const pairs = [...new Map(rows.map((row) => [`${row.item.auction.id}:${row.bidder.id}`, row])).values()];
    if (pairs.length === 0) return new Map();
    const participants = await prisma.auctionParticipant.findMany({
        where: { OR: pairs.map((row) => ({ auctionId: row.item.auction.id, userId: row.bidder.id })) },
        select: { auctionId: true, userId: true, paddleNumber: true },
    });
    return new Map(participants.map((p) => [`${p.auctionId}:${p.userId}`, p.paddleNumber]));
};

/** How many different bidders left proxies from each IP — more than one is worth a look */
const readIpSharing = async (rows) => {
    const ips = [...new Set(rows.map((row) => row.ipAddress).filter(Boolean))];
    if (ips.length === 0) return new Map();
    const counts = await prisma.$queryRaw`
        SELECT "ipAddress", COUNT(DISTINCT "bidderId")::int AS "bidders"
        FROM auto_bids
        WHERE "ipAddress" = ANY(${ips})
        GROUP BY "ipAddress"
    `;
    return new Map(counts.map((row) => [row.ipAddress, row.bidders]));
};

/**
 * WITHDRAWN    taken away with the bidder's access
 * WAITING      the lot hasn't opened — it bids when it does
 * LEADING      the lot is live and this bidder holds it
 * IN_PLAY      the lot is live, someone else leads, but the maximum can still top them
 * OUTBID       the bid went past the maximum (or someone else won)
 * WON          the lot sold to this bidder
 * RESERVE_NOT_MET  held the lot when it closed, below the reserve
 * LOT_CLOSED   the lot closed without selling (no bids, or withdrawn)
 */
const outcomeOf = (row, position) => {
    if (row.withdrawnAt) return "WITHDRAWN";
    const { status } = row.item;
    if (PROXY_LOT_STATUSES.includes(status)) return "WAITING";

    const bidderId = row.bidder.id.toString();
    const max = Number(row.maxAmount);
    const leads = position.leaderId === bidderId;

    if (status === "ACTIVE") {
        if (leads) return "LEADING";
        // proxies are placed at the hammer; one equal to the standing bid still takes it (set first)
        return position.currentBid !== null && position.currentBid > max ? "OUTBID" : "IN_PLAY";
    }
    if (status === "SOLD") {
        // older sales may have no winner row — the lot's top bidder is who it sold to
        const winnerId = row.item.winner?.winnerId?.toString() ?? position.leaderId;
        return winnerId === bidderId ? "WON" : "OUTBID";
    }
    if (status === "PASSED") return leads ? "RESERVE_NOT_MET" : "OUTBID";
    return position.bidCount > 0 && !leads ? "OUTBID" : "LOT_CLOSED";
};

const decimal = (value) => (value === null || value === undefined ? null : String(value));

/** Adds paddles, positions, outcomes, bids placed and IP sharing to a batch of rows. */
const enrich = async (rows) => {
    const [paddles, positions, totals, ipSharing] = await Promise.all([
        readPaddles(rows),
        readPositions(rows.map((row) => row.item)),
        readProxyBidTotals(rows),
        readIpSharing(rows),
    ]);

    return rows.map((row) => {
        const { bidder, item } = row;
        const { auction } = item;
        const position = positions.get(item.uuid);
        const bidderId = bidder.id.toString();
        const total = totals.get(`${item.uuid}:${bidderId}`);
        const outcome = outcomeOf(row, position);
        const location = [bidder.profile?.city, bidder.profile?.country].filter(Boolean).join(", ");

        return {
            id: row.id.toString(),
            maxAmount: String(row.maxAmount),
            currency: item.currency ?? auction.currency,
            outcome,
            active: row.isActive,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            ipAddress: row.ipAddress,
            userAgent: row.userAgent,
            ipSharedBy: row.ipAddress ? ipSharing.get(row.ipAddress) ?? 1 : 0,
            withdrawnAt: row.withdrawnAt,
            withdrawnReason: row.withdrawnReason,
            bidder: {
                uuid: bidder.uuid,
                name: displayName(bidder),
                username: bidder.username,
                email: bidder.email,
                phone: bidder.phone,
                paddle: paddles.get(`${auction.id}:${bidderId}`) ?? null,
                role: bidder.role?.name ?? null,
                accountStatus: bidder.status,
                kycStatus: bidder.kyc?.status ?? "NOT_SUBMITTED",
                location: location || null,
            },
            lot: {
                uuid: item.uuid,
                itemNumber: item.itemNumber.toString(),
                title: item.title,
                status: item.status,
                startingPrice: decimal(item.startingPrice),
                reservePrice: decimal(item.reservePrice),
                estimateLow: decimal(item.estimateLow),
                estimateHigh: decimal(item.estimateHigh),
                scheduledStartAt: item.scheduledStartAt,
                currentBid: position.currentBid === null ? null : String(position.currentBid),
                bidCount: String(position.bidCount),
                leading: position.leaderId === bidderId,
                hammerPrice: outcome === "WON" ? decimal(item.winner?.finalHammerPrice ?? position.currentBid) : null,
            },
            auction: { uuid: auction.uuid, title: auction.title, status: auction.status, auctionType: auction.auctionType },
            proxyBids: { count: total.count, highest: total.highest === null ? null : String(total.highest) },
        };
    });
};

// ---------------------------------------------------------------------
// list / summary / export
// ---------------------------------------------------------------------

export const getProxyBidsService = async ({ page, limit, ...filters }) => {
    const where = buildWhere(filters);
    const [total, rows] = await prisma.$transaction([
        prisma.autoBid.count({ where }),
        prisma.autoBid.findMany({ where, select: PROXY_SELECT, orderBy: ORDER, skip: (page - 1) * limit, take: limit }),
    ]);

    return {
        proxies: await enrich(rows),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
};

/**
 * One lot's proxy bids (bid history, auctioneer console): strongest first —
 * highest maximum, then earliest, the order they'd win in — withdrawn ones last.
 * Staff below admin get no IP / device / email / phone.
 */
export const getLotProxiesService = async ({ lotUuid, role }) => {
    const lot = await prisma.auctionItem.findUnique({
        where: { uuid: lotUuid },
        select: { id: true, auction: { select: { deletedAt: true } } },
    });
    if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);

    const rows = await prisma.autoBid.findMany({ where: { itemId: lot.id }, select: PROXY_SELECT });
    const proxies = (await enrich(rows)).sort(
        (a, b) =>
            Number(Boolean(a.withdrawnAt)) - Number(Boolean(b.withdrawnAt)) ||
            Number(b.maxAmount) - Number(a.maxAmount) ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const canSeeOrigin = ORIGIN_ROLES.includes(role);
    return {
        canSeeOrigin,
        proxies: canSeeOrigin
            ? proxies
            : proxies.map((row) => ({
                  ...row,
                  ipAddress: null,
                  userAgent: null,
                  ipSharedBy: 0,
                  bidder: { ...row.bidder, email: null, phone: null },
              })),
    };
};

/** Totals for the cards (whole platform, or one auction) and the auctions to filter by. */
export const getProxyBidSummaryService = async ({ auctionUuid }) => {
    const scope = auctionUuid ? Prisma.sql`AND a.uuid = ${auctionUuid}::uuid` : Prisma.empty;

    const [[totals], [shared], auctions] = await Promise.all([
        prisma.$queryRaw`
            SELECT
                COUNT(*)::int                                                                               AS "total",
                COUNT(*) FILTER (WHERE ab."withdrawnAt" IS NULL AND ai.status IN ('DRAFT', 'SCHEDULED'))::int AS "waiting",
                COUNT(*) FILTER (WHERE ab."withdrawnAt" IS NULL AND ai.status = 'ACTIVE')::int               AS "live",
                COUNT(*) FILTER (WHERE ai.status = 'SOLD' AND COALESCE(aw."winnerId", ai."currentBidderId") = ab."bidderId")::int AS "won",
                COUNT(*) FILTER (WHERE ab."withdrawnAt" IS NOT NULL)::int                                    AS "withdrawn",
                COUNT(DISTINCT ab."bidderId")::int                                                           AS "bidders",
                COUNT(DISTINCT ab."ipAddress")::int                                                          AS "uniqueIps"
            FROM auto_bids ab
            JOIN auction_items ai ON ai.id = ab."itemId"
            JOIN auctions a ON a.id = ai."auctionId"
            LEFT JOIN auction_winners aw ON aw."itemId" = ab."itemId"
            WHERE a."deletedAt" IS NULL ${scope}
        `,
        prisma.$queryRaw`
            SELECT COUNT(*)::int AS "sharedIps"
            FROM (
                SELECT ab."ipAddress"
                FROM auto_bids ab
                JOIN auction_items ai ON ai.id = ab."itemId"
                JOIN auctions a ON a.id = ai."auctionId"
                WHERE a."deletedAt" IS NULL AND ab."ipAddress" IS NOT NULL ${scope}
                GROUP BY ab."ipAddress"
                HAVING COUNT(DISTINCT ab."bidderId") > 1
            ) shared
        `,
        prisma.auction.findMany({
            where: { deletedAt: null, items: { some: { autoBids: { some: {} } } } },
            orderBy: { startTime: "desc" },
            select: { uuid: true, title: true, status: true, startTime: true },
        }),
    ]);

    return { totals: { ...totals, sharedIps: shared.sharedIps }, auctions };
};

const OUTCOME_LABELS = {
    WITHDRAWN: "Withdrawn",
    WAITING: "Waiting for lot",
    LEADING: "Leading",
    IN_PLAY: "In play",
    OUTBID: "Outbid",
    WON: "Won",
    RESERVE_NOT_MET: "Reserve not met",
    LOT_CLOSED: "Lot closed unsold",
};

export const exportProxyBidsService = async (filters) => {
    const where = buildWhere(filters);
    const rows = [];
    for (let skip = 0; skip < EXPORT_MAX_ROWS; skip += EXPORT_BATCH) {
        const batch = await prisma.autoBid.findMany({ where, select: PROXY_SELECT, orderBy: ORDER, skip, take: EXPORT_BATCH });
        rows.push(...(await enrich(batch)));
        if (batch.length < EXPORT_BATCH) break;
    }

    const header = [
        "Set at (UTC)", "Auction", "Lot", "Lot title", "Lot status", "Bidder", "Username", "Email", "Phone", "Paddle",
        "KYC", "Account status", "Location", "Currency", "Maximum bid", "Starting price", "Reserve", "Current bid",
        "Proxy bids placed", "Highest proxy bid", "Hammer price", "Result", "IP address", "Bidders on this IP",
        "User agent", "Withdrawn at (UTC)", "Withdrawn reason",
    ];
    const lines = rows.map((row) => [
        new Date(row.createdAt).toISOString(),
        row.auction.title,
        `#${row.lot.itemNumber}`,
        row.lot.title,
        row.lot.status,
        row.bidder.name,
        row.bidder.username,
        row.bidder.email,
        row.bidder.phone,
        row.bidder.paddle ? `#${row.bidder.paddle}` : null,
        row.bidder.kycStatus,
        row.bidder.accountStatus,
        row.bidder.location,
        row.currency.code,
        row.maxAmount,
        row.lot.startingPrice,
        row.lot.reservePrice,
        row.lot.currentBid,
        row.proxyBids.count,
        row.proxyBids.highest,
        row.lot.hammerPrice,
        OUTCOME_LABELS[row.outcome] ?? row.outcome,
        row.ipAddress,
        row.ipSharedBy || null,
        row.userAgent,
        row.withdrawnAt ? new Date(row.withdrawnAt).toISOString() : null,
        row.withdrawnReason,
    ]);

    return toCsv(header, lines);
};
