import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";

/**
 * Status-based, so it always agrees with the status a super admin set:
 *   upcoming = published but not started yet
 *   past     = finished one way or another
 */
export const TIMELINE = {
    upcoming: {
        statuses: ["SCHEDULED", "PREVIEW"],
        orderBy: [{ startTime: "asc" }],
    },
    past: {
        statuses: ["ENDED", "SETTLED", "CANCELLED"],
        orderBy: [{ endTime: "desc" }],
    },
};

const DAY_MS = 24 * 60 * 60 * 1000;

const sumBy = (items, pick) => items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);

// =====================================================================
// GET PAST / UPCOMING AUCTIONS
// =====================================================================

export const getAuctionTimelineService = async ({ type, search, page, limit }) => {
    const { statuses, orderBy } = TIMELINE[type];

    const base = { deletedAt: null, status: { in: statuses } };
    const where = {
        ...base,
        ...(search && {
            OR: [
                { title: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
                { category: { name: { contains: search, mode: "insensitive" } } },
            ],
        }),
    };

    const now = new Date();

    // Independent reads — Promise.all (not $transaction) so they don't share one pg client
    const [total, auctions, byStatus, startingSoon] = await Promise.all([
        prisma.auction.count({ where }),
        prisma.auction.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                uuid: true,
                title: true,
                slug: true,
                status: true,
                auctionType: true,
                coverImageUrl: true,
                startTime: true,
                endTime: true,
                previewStartAt: true,
                registrationDeadline: true,
                isOnline: true,
                venue: true,
                currency: { select: { code: true, symbol: true } },
                category: { select: { name: true } },
                subCategory: { select: { name: true } },
                items: {
                    select: {
                        status: true,
                        currentBid: true,
                        startingPrice: true,
                        estimateLow: true,
                        estimateHigh: true,
                        currency: { select: { code: true } },
                    },
                },
            },
        }),
        // per-status counts for the summary cards (ignores search)
        prisma.auction.groupBy({ by: ["status"], where: base, _count: { _all: true }, orderBy: { status: "asc" } }),
        prisma.auction.count({
            where: { ...base, startTime: { gte: now, lte: new Date(now.getTime() + DAY_MS) } },
        }),
    ]);

    // Verified bidders per upcoming auction (a user verified on several lots counts once)
    const biddersByAuction = new Map();
    if (type === "upcoming" && auctions.length) {
        const rows = await prisma.lotBidder.findMany({
            where: { status: "VERIFIED", item: { auctionId: { in: auctions.map((a) => a.id) } } },
            select: { userId: true, item: { select: { auctionId: true } } },
        });
        for (const row of rows) {
            const key = row.item.auctionId.toString();
            if (!biddersByAuction.has(key)) biddersByAuction.set(key, new Set());
            biddersByAuction.get(key).add(row.userId.toString());
        }
    }

    const statusCounts = Object.fromEntries(statuses.map((s) => [s, 0]));
    for (const row of byStatus) statusCounts[row.status] = row._count._all;

    return serializeBigInt({
        auctions: auctions.map(({ id, items, ...auction }) => {
            const code = auction.currency.code;
            // Money totals only in the auction's primary currency (no FX conversion)
            const sameCurrency = items.filter((lot) => (lot.currency?.code ?? code) === code);

            const common = { ...auction, lotCount: items.length };

            if (type === "upcoming") {
                return {
                    ...common,
                    verifiedBidders: biddersByAuction.get(id.toString())?.size ?? 0,
                    estimate: {
                        low: sumBy(sameCurrency, (lot) => lot.estimateLow ?? lot.startingPrice),
                        high: sumBy(sameCurrency, (lot) => lot.estimateHigh ?? lot.estimateLow ?? lot.startingPrice),
                        currency: code,
                    },
                };
            }

            const sold = items.filter((lot) => lot.status === "SOLD");
            const offered = items.filter((lot) => lot.status !== "WITHDRAWN");
            return {
                ...common,
                results: {
                    sold: sold.length,
                    unsold: items.filter((lot) => lot.status === "UNSOLD" || lot.status === "PASSED").length,
                    withdrawn: items.length - offered.length,
                    sellThrough: offered.length ? Math.round((sold.length / offered.length) * 100) : 0,
                    totalSold: sumBy(
                        sold.filter((lot) => (lot.currency?.code ?? code) === code),
                        (lot) => lot.currentBid
                    ),
                    currency: code,
                },
            };
        }),
        summary: {
            total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
            byStatus: statusCounts,
            ...(type === "upcoming" && { startingIn24h: startingSoon }),
        },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
};
