import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { getAuctionStatsService, TIMELINE } from "./auctionTimeline.services.js";
import { getSalesBidSnapshot } from "./bidding.services.js";

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
