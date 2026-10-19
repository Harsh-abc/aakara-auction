import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { getAuctionStatsService, TIMELINE } from "./auctionTimeline.services.js";
import { getSalesBidSnapshot, overlayLiveBids, readLiveLotBids } from "./bidding.services.js";

// =====================================================================
// Dashboard home
//
// Running sales (LIVE / PAUSED) are read from Redis, where their bids are
// settled; finished sales from the bids table (written when the sale ends).
// =====================================================================

const LIVE_STATUSES = ["LIVE", "PAUSED"];

const UPCOMING_LIMIT = 5;
const LIVE_LIMIT = 5;
const RECENT_BIDS_LIMIT = 8;

const displayName = (user) => {
    const p = user?.profile;
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
    return p?.displayName || full || user?.username || null;
};

/** Final bid statuses from the bids table, in the dashboard's terms */
const SAVED_BID_STATUS = {
    PLACED: "LEADING",
    WINNING: "LEADING",
    OUTBID: "OUTBID",
    WON: "WON",
    LOST: "LOST",
    CANCELLED: "CANCELLED",
    RETRACTED: "CANCELLED",
};

/** Lowest opening price among an auction's lots, in its primary currency */
const startingBid = (auction) => {
    const code = auction.currency.code;
    const prices = auction.items
        .filter((lot) => (lot.currency?.code ?? code) === code)
        .map((lot) => Number(lot.startingPrice));
    return prices.length ? Math.min(...prices) : null;
};

// =====================================================================
// OVERVIEW — stat cards, upcoming sales, running sales, latest bids
// =====================================================================

export const getDashboardOverviewService = async () => {
    const notDeleted = { deletedAt: null };

    // Independent reads — Promise.all (not $transaction) so they don't share one pg client
    const [stats, upcoming, running, savedBids] = await Promise.all([
        getAuctionStatsService(),
        prisma.auction.findMany({
            where: { ...notDeleted, status: { in: TIMELINE.upcoming.statuses } },
            orderBy: TIMELINE.upcoming.orderBy,
            take: UPCOMING_LIMIT,
            select: {
                uuid: true,
                title: true,
                status: true,
                coverImageUrl: true,
                startTime: true,
                currency: { select: { code: true, symbol: true } },
                items: { select: { startingPrice: true, currency: { select: { code: true } } } },
            },
        }),
        prisma.auction.findMany({
            where: { ...notDeleted, status: { in: LIVE_STATUSES } },
            orderBy: { startTime: "asc" },
            select: {
                id: true,
                uuid: true,
                title: true,
                status: true,
                coverImageUrl: true,
                startTime: true,
                endTime: true,
                currency: { select: { code: true, symbol: true } },
                category: { select: { name: true } },
                items: { select: { uuid: true, itemNumber: true, status: true, currentBid: true, bidCount: true } },
            },
        }),
        // bids of finished sales (running sales' bids are still in Redis)
        prisma.bid.findMany({
            where: { item: { auction: notDeleted } },
            orderBy: { placedAt: "desc" },
            take: RECENT_BIDS_LIMIT,
            select: {
                uuid: true,
                amount: true,
                source: true,
                status: true,
                placedAt: true,
                bidderId: true,
                bidder: {
                    select: {
                        uuid: true,
                        username: true,
                        profile: { select: { displayName: true, firstName: true, lastName: true } },
                    },
                },
                item: {
                    select: {
                        uuid: true,
                        itemNumber: true,
                        title: true,
                        currency: { select: { code: true, symbol: true } },
                        auction: {
                            select: { id: true, uuid: true, title: true, currency: { select: { code: true, symbol: true } } },
                        },
                    },
                },
            },
        }),
    ]);

    const liveLotOf = (auction) => auction.items.find((lot) => lot.status === "ACTIVE") ?? null;

    const snapshots = await getSalesBidSnapshot(
        running.map((auction) => ({ id: auction.id, uuid: auction.uuid, liveLotUuid: liveLotOf(auction)?.uuid ?? null })),
        { feedSize: RECENT_BIDS_LIMIT }
    );

    // paddle numbers for the saved bids
    const pairs = [
        ...new Map(
            savedBids.map((bid) => [`${bid.item.auction.id}:${bid.bidderId}`, { auctionId: bid.item.auction.id, userId: bid.bidderId }])
        ).values(),
    ];
    const participants = pairs.length
        ? await prisma.auctionParticipant.findMany({
              where: { OR: pairs },
              select: { auctionId: true, userId: true, paddleNumber: true },
          })
        : [];
    const paddleOf = new Map(participants.map((p) => [`${p.auctionId}:${p.userId}`, p.paddleNumber]));

    const liveBids = running.flatMap((auction) =>
        (snapshots.get(auction.uuid)?.bids ?? []).map((bid) => ({
            uuid: bid.uuid,
            amount: bid.amount,
            source: bid.source,
            placedAt: bid.placedAt,
            status: bid.leading ? "LEADING" : "OUTBID",
            bidder: bid.bidder,
            lot: { uuid: bid.lotUuid, itemNumber: bid.itemNumber, title: bid.title },
            auction: { uuid: auction.uuid, title: auction.title },
            currency: bid.currency ?? auction.currency,
        }))
    );

    const storedBids = savedBids.map((bid) => ({
        uuid: bid.uuid,
        amount: bid.amount,
        source: bid.source,
        placedAt: bid.placedAt.toISOString(),
        status: SAVED_BID_STATUS[bid.status] ?? bid.status,
        bidder: {
            uuid: bid.bidder.uuid,
            paddle: paddleOf.get(`${bid.item.auction.id}:${bid.bidderId}`) ?? null,
            name: displayName(bid.bidder),
        },
        lot: { uuid: bid.item.uuid, itemNumber: bid.item.itemNumber, title: bid.item.title },
        auction: { uuid: bid.item.auction.uuid, title: bid.item.auction.title },
        currency: bid.item.currency ?? bid.item.auction.currency,
    }));

    // a sale being flushed can briefly have its bids in both places
    const seen = new Set();
    const recentBids = [...liveBids, ...storedBids]
        .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt))
        .filter((bid) => {
            const key = `${bid.lot.uuid}:${bid.placedAt}:${bid.amount}:${bid.bidder?.uuid}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, RECENT_BIDS_LIMIT);

    return serializeBigInt({
        stats,
        upcoming: upcoming.map(({ items, ...auction }) => ({
            ...auction,
            lotCount: items.length,
            startingBid: startingBid({ ...auction, items }),
        })),
        live: running.slice(0, LIVE_LIMIT).map(({ id, items, category, ...auction }) => {
            const snapshot = snapshots.get(auction.uuid);
            const liveLot = liveLotOf({ items });
            // Redis is empty for a sale nobody has bid on yet, or after a restart — fall back to the last snapshot
            const savedTotal = items.reduce((total, lot) => total + Number(lot.bidCount), 0);
            const savedLiveBid = liveLot && Number(liveLot.bidCount) > 0 ? Number(liveLot.currentBid) : null;
            // between lots, the sale's latest bid (a live lot with no bids yet shows none)
            const latestBid = snapshot?.bids[0] ? Number(snapshot.bids[0].amount) : null;

            return {
                ...auction,
                category: category?.name ?? null,
                lotCount: items.length,
                liveLot: liveLot && { uuid: liveLot.uuid, itemNumber: liveLot.itemNumber },
                currentBid: liveLot ? snapshot?.liveLot?.currentBid ?? savedLiveBid : latestBid,
                totalBids: snapshot?.stats.totalBids || savedTotal,
                bidders: snapshot?.stats.bidders ?? 0,
            };
        }),
        recentBids,
    });
};

// =====================================================================
// CALENDAR — published sales overlapping a month
// =====================================================================

const CALENDAR_STATUSES = ["SCHEDULED", "PREVIEW", "LIVE", "PAUSED", "ENDED", "SETTLED"];
const DAY_MS = 24 * 60 * 60 * 1000;

export const getDashboardCalendarService = async ({ month }) => {
    const [year, monthIndex] = month.split("-").map(Number);
    // a day of slack either side: the client places sales on its own local dates
    const from = new Date(Date.UTC(year, monthIndex - 1, 1) - DAY_MS);
    const to = new Date(Date.UTC(year, monthIndex, 1) + DAY_MS);

    const auctions = await prisma.auction.findMany({
        where: {
            deletedAt: null,
            status: { in: CALENDAR_STATUSES },
            startTime: { lt: to },
            endTime: { gte: from },
        },
        orderBy: { startTime: "asc" },
        take: 500,
        select: { uuid: true, title: true, status: true, startTime: true, endTime: true },
    });

    return serializeBigInt({ month, auctions });
};

// =====================================================================
// LOT BID HISTORY — every bid and bidder on each lot, sale by sale.
// A lot's bids come from Redis while they're held there, otherwise from
// the bids table (see the note at the top of bidding.services.js).
// =====================================================================

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/** Sales that can have bids: running, or over — and upcoming ones, which can already hold proxy bids */
const HISTORY_STATUSES = {
    live: LIVE_STATUSES,
    upcoming: TIMELINE.upcoming.statuses,
    past: TIMELINE.past.statuses,
    all: [...LIVE_STATUSES, ...TIMELINE.upcoming.statuses, ...TIMELINE.past.statuses],
};

/** Lots that are still open — their top bid is "leading", not won / lost yet */
const OPEN_LOT_STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE"];

/** Final status of a bid still held in Redis, in the dashboard's terms */
const liveBidStatus = ({ isTop, lotStatus, auctionStatus }) => {
    if (auctionStatus === "CANCELLED") return "CANCELLED";
    if (!isTop) return "OUTBID";
    if (OPEN_LOT_STATUSES.includes(lotStatus)) return "LEADING";
    return lotStatus === "SOLD" ? "WON" : "LOST";
};

/** Map of userId -> { uuid, paddle, name, username } for one sale */
const biddersOf = async (auctionId, userIds) => {
    const ids = [...new Set(userIds.filter(Boolean).map(String))].map(BigInt);
    if (ids.length === 0) return new Map();

    const [users, participants] = await Promise.all([
        prisma.user.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                uuid: true,
                username: true,
                profile: { select: { displayName: true, firstName: true, lastName: true } },
            },
        }),
        prisma.auctionParticipant.findMany({
            where: { auctionId, userId: { in: ids } },
            select: { userId: true, paddleNumber: true },
        }),
    ]);
    const paddleOf = new Map(participants.map((p) => [p.userId.toString(), p.paddleNumber]));

    return new Map(
        users.map((user) => [
            user.id.toString(),
            {
                uuid: user.uuid,
                paddle: paddleOf.get(user.id.toString()) ?? null,
                name: displayName(user),
                username: user.username,
            },
        ])
    );
};

// ---------------------------------------------------------------------
// The sales — newest first
// ---------------------------------------------------------------------

export const getBidHistoryAuctionsService = async ({ status, search, page, limit }) => {
    const where = {
        deletedAt: null,
        status: { in: HISTORY_STATUSES[status] },
        ...(search && { title: { contains: search, mode: "insensitive" } }),
    };

    const [total, auctions] = await Promise.all([
        prisma.auction.count({ where }),
        prisma.auction.findMany({
            where,
            orderBy: [{ startTime: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
            select: {
                uuid: true,
                title: true,
                status: true,
                startTime: true,
                endTime: true,
                currency: { select: { code: true, symbol: true } },
                items: { select: { uuid: true, bidCount: true } },
            },
        }),
    ]);

    // running sales: bid counts from Redis (the database copy trails by a scheduler tick)
    const counted = await Promise.all(
        auctions.map(async ({ items, ...auction }) => {
            const lots = LIVE_STATUSES.includes(auction.status) ? await overlayLiveBids(items) : items;
            return {
                ...auction,
                lotCount: items.length,
                totalBids: lots.reduce((sum, lot) => sum + Number(lot.bidCount), 0),
            };
        })
    );

    return serializeBigInt({
        auctions: counted,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
};

// ---------------------------------------------------------------------
// One sale — its lots with bid totals and who leads / won each
// ---------------------------------------------------------------------

export const getAuctionBidHistoryService = async ({ auctionUuid }) => {
    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: {
            id: true,
            uuid: true,
            title: true,
            status: true,
            startTime: true,
            endTime: true,
            deletedAt: true,
            currency: { select: { code: true, symbol: true } },
            items: {
                orderBy: { itemNumber: "asc" },
                select: {
                    id: true,
                    uuid: true,
                    itemNumber: true,
                    title: true,
                    status: true,
                    startingPrice: true,
                    currentBid: true,
                    currentBidderId: true,
                    currency: { select: { code: true, symbol: true } },
                    images: {
                        where: { mediaType: "IMAGE" },
                        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                        take: 1,
                        select: { url: true, thumbnailUrl: true },
                    },
                },
            },
        },
    });
    if (!auction || auction.deletedAt) throw httpError("Auction not found", 404);

    const live = await readLiveLotBids(auction.items.map((lot) => lot.uuid));
    const savedLotIds = auction.items.filter((lot) => !live.has(lot.uuid)).map((lot) => lot.id);

    // proxy bids left on each lot (withdrawn ones aren't counted)
    const proxyRows = auction.items.length
        ? await prisma.autoBid.groupBy({
              by: ["itemId"],
              where: { itemId: { in: auction.items.map((lot) => lot.id) }, withdrawnAt: null },
              _count: { _all: true },
          })
        : [];
    const proxiesByLot = new Map(proxyRows.map((row) => [row.itemId.toString(), row._count._all]));

    // one row per (lot, bidder) for lots whose bids are in the database
    const savedRows = savedLotIds.length
        ? await prisma.bid.groupBy({
              by: ["itemId", "bidderId"],
              where: { itemId: { in: savedLotIds } },
              _count: { _all: true },
          })
        : [];
    const savedByLot = new Map();
    for (const row of savedRows) {
        const key = row.itemId.toString();
        if (!savedByLot.has(key)) savedByLot.set(key, []);
        savedByLot.get(key).push(row);
    }

    const allBidders = new Set();
    const lots = auction.items.map((lot) => {
        const liveBids = live.get(lot.uuid);
        if (liveBids) {
            const top = liveBids[liveBids.length - 1];
            const bidderIds = new Set(liveBids.map((bid) => bid.userId));
            bidderIds.forEach((id) => allBidders.add(id));
            return { lot, bidCount: liveBids.length, bidders: bidderIds.size, topBid: top.amount, leaderId: top.userId };
        }

        const rows = savedByLot.get(lot.id.toString()) ?? [];
        rows.forEach((row) => allBidders.add(row.bidderId.toString()));
        const bidCount = rows.reduce((sum, row) => sum + row._count._all, 0);
        return {
            lot,
            bidCount,
            bidders: rows.length,
            // written when the lot closes / the sale's bids are saved
            topBid: bidCount > 0 && lot.currentBid !== null ? lot.currentBid.toString() : null,
            leaderId: bidCount > 0 ? lot.currentBidderId?.toString() ?? null : null,
        };
    });

    const bidders = await biddersOf(auction.id, lots.map((row) => row.leaderId));

    // eslint-disable-next-line no-unused-vars
    const { id, deletedAt, items, ...header } = auction;
    return serializeBigInt({
        auction: {
            ...header,
            lotCount: items.length,
            totalBids: lots.reduce((sum, row) => sum + row.bidCount, 0),
            bidders: allBidders.size,
            proxyBids: proxyRows.reduce((sum, row) => sum + row._count._all, 0),
        },
        lots: lots.map(({ lot, bidCount, bidders: bidderCount, topBid, leaderId }) => ({
            uuid: lot.uuid,
            itemNumber: lot.itemNumber,
            title: lot.title,
            status: lot.status,
            imageUrl: lot.images[0]?.thumbnailUrl || lot.images[0]?.url || null,
            currency: lot.currency ?? auction.currency,
            startingPrice: lot.startingPrice,
            bidCount,
            bidders: bidderCount,
            proxyCount: proxiesByLot.get(lot.id.toString()) ?? 0,
            topBid,
            leader: leaderId ? bidders.get(leaderId) ?? null : null,
        })),
    });
};

// ---------------------------------------------------------------------
// One lot — every bid (newest first) and a line per bidder
// ---------------------------------------------------------------------

export const getLotBidHistoryService = async ({ lotUuid }) => {
    const lot = await prisma.auctionItem.findUnique({
        where: { uuid: lotUuid },
        select: {
            id: true,
            uuid: true,
            itemNumber: true,
            title: true,
            status: true,
            startingPrice: true,
            currency: { select: { code: true, symbol: true } },
            auction: {
                select: {
                    id: true,
                    uuid: true,
                    title: true,
                    status: true,
                    deletedAt: true,
                    currency: { select: { code: true, symbol: true } },
                },
            },
        },
    });
    if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);

    const liveBids = (await readLiveLotBids([lotUuid])).get(lotUuid);

    let bids; // oldest first
    if (liveBids) {
        bids = liveBids.map((bid, index) => ({
            ...bid,
            status: liveBidStatus({
                isTop: index === liveBids.length - 1,
                lotStatus: lot.status,
                auctionStatus: lot.auction.status,
            }),
        }));
    } else {
        // the bids of a lot are written in one go, in order — id order is bid order
        const saved = await prisma.bid.findMany({
            where: { itemId: lot.id },
            orderBy: { id: "asc" },
            select: { uuid: true, amount: true, source: true, status: true, placedAt: true, bidderId: true },
        });
        bids = saved.map((bid, index) => ({
            uuid: bid.uuid,
            seq: index + 1,
            amount: bid.amount.toString(),
            source: bid.source,
            placedAt: bid.placedAt.toISOString(),
            status: SAVED_BID_STATUS[bid.status] ?? bid.status,
            userId: bid.bidderId.toString(),
        }));
    }

    const bidderInfo = await biddersOf(lot.auction.id, bids.map((bid) => bid.userId));
    const top = bids[bids.length - 1] ?? null;

    // one line per bidder, highest bid first
    const perBidder = new Map();
    for (const bid of bids) {
        const row = perBidder.get(bid.userId) ?? {
            userId: bid.userId,
            bids: 0,
            manualBids: 0,
            proxyBids: 0,
            highestBid: 0,
            firstBidAt: bid.placedAt,
            lastBidAt: bid.placedAt,
        };
        row.bids += 1;
        // floor bids are placed by the bidder too (through the auctioneer)
        if (bid.source === "PROXY") row.proxyBids += 1;
        else row.manualBids += 1;
        row.highestBid = Math.max(row.highestBid, Number(bid.amount));
        row.lastBidAt = bid.placedAt;
        perBidder.set(bid.userId, row);
    }

    const { id, deletedAt, currency: auctionCurrency, ...auction } = lot.auction; // eslint-disable-line no-unused-vars
    return serializeBigInt({
        auction,
        lot: {
            uuid: lot.uuid,
            itemNumber: lot.itemNumber,
            title: lot.title,
            status: lot.status,
            startingPrice: lot.startingPrice,
            currency: lot.currency ?? auctionCurrency,
        },
        summary: {
            totalBids: bids.length,
            bidders: perBidder.size,
            topBid: top?.amount ?? null,
            leader: top ? bidderInfo.get(top.userId) ?? null : null,
            leaderStatus: top?.status ?? null,
        },
        bids: bids
            .map(({ userId, ...bid }) => ({ ...bid, bidder: bidderInfo.get(userId) ?? null }))
            .reverse(),
        // the top bidder first (a proxy can match a manual bid's amount and still lead), then by highest bid
        bidders: [...perBidder.values()]
            .map((row) => ({ ...row, top: row.userId === top?.userId }))
            .sort((a, b) => Number(b.top) - Number(a.top) || b.highestBid - a.highestBid)
            .map(({ userId, highestBid, ...row }) => ({
                ...row,
                bidder: bidderInfo.get(userId) ?? null,
                highestBid: String(highestBid),
            })),
    });
};
