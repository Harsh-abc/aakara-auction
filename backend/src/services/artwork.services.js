import prisma from "../libs/prisma.js";
import redis from "../libs/redis.js";
import { bidKeys } from "../libs/biddingStore.js";
import { serializeBigInt } from "../utils/serialize.js";
import { overlayLiveBids } from "./bidding.services.js";

// =====================================================================
// Dashboard: Artworks — the house's catalogue. Every lot of every
// (non-deleted) auction, with its catalogue details, pricing and how it
// sold. A live lot's current bid comes from the bidding engine (Redis).
// =====================================================================

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/** Lot statuses behind each stage filter */
const STAGE_LOT_STATUSES = {
    upcoming: ["DRAFT", "SCHEDULED"],
    live: ["ACTIVE"],
    sold: ["SOLD"],
    unsold: ["UNSOLD", "PASSED"],
    withdrawn: ["WITHDRAWN"],
};

const SORTS = {
    newest: [{ createdAt: "desc" }, { id: "desc" }],
    title: [{ title: "asc" }, { id: "asc" }],
    artist: [{ artistName: { sort: "asc", nulls: "last" } }, { title: "asc" }],
    estimate: [{ estimateHigh: { sort: "desc", nulls: "last" } }, { estimateLow: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    // a sold lot's current bid is its hammer price
    price: [{ currentBid: { sort: "desc", nulls: "last" } }, { id: "desc" }],
};

const NOT_DELETED = { auction: { deletedAt: null } };

const displayName = (user) => {
    const p = user?.profile;
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
    return p?.displayName || full || user?.username || null;
};

const decimal = (value) => (value === null || value === undefined ? null : String(value));

const buildWhere = ({ search, auctionUuid, categoryUuid, stage }) => {
    const where = { auction: { deletedAt: null, ...(auctionUuid && { uuid: auctionUuid }) } };
    if (stage && stage !== "all") where.status = { in: STAGE_LOT_STATUSES[stage] };

    const and = [];
    // a lot without its own category takes the auction's
    if (categoryUuid) {
        and.push({
            OR: [{ category: { uuid: categoryUuid } }, { categoryId: null, auction: { category: { uuid: categoryUuid } } }],
        });
    }
    if (search) {
        const contains = { contains: search, mode: "insensitive" };
        const or = [{ title: contains }, { artistName: contains }, { medium: contains }, { auction: { title: contains } }];
        const lotNumber = search.replace(/^(lot\s*)?#?/i, "");
        if (/^\d{1,15}$/.test(lotNumber)) or.push({ itemNumber: BigInt(lotNumber) });
        and.push({ OR: or });
    }
    if (and.length) where.AND = and;
    return where;
};

const DIMENSION_SELECT = { width: true, height: true, depth: true, dimensionUnit: true };

const dimensionOf = (dimension) =>
    dimension
        ? {
              width: decimal(dimension.width),
              height: decimal(dimension.height),
              depth: decimal(dimension.depth),
              unit: dimension.dimensionUnit,
          }
        : null;

const ARTWORK_SELECT = {
    id: true,
    uuid: true,
    itemNumber: true,
    title: true,
    artistName: true,
    medium: true,
    yearCreated: true,
    editionType: true,
    status: true,
    isFeatured: true,
    startingPrice: true,
    reservePrice: true,
    estimateLow: true,
    estimateHigh: true,
    currentBid: true,
    bidCount: true,
    scheduledStartAt: true,
    createdAt: true,
    dimension: { select: DIMENSION_SELECT },
    images: {
        where: { mediaType: "IMAGE" },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { url: true, thumbnailUrl: true },
    },
    _count: { select: { images: true, documents: true, savedBy: true } },
    category: { select: { name: true } },
    currency: { select: { code: true, symbol: true } },
    winner: { select: { finalHammerPrice: true } },
    auction: {
        select: {
            uuid: true,
            title: true,
            status: true,
            visibility: true,
            category: { select: { name: true } },
            currency: { select: { code: true, symbol: true } },
        },
    },
};

const toRow = (lot) => ({
    uuid: lot.uuid,
    itemNumber: lot.itemNumber.toString(),
    title: lot.title,
    artist: lot.artistName,
    medium: lot.medium,
    year: lot.yearCreated,
    edition: lot.editionType,
    dimensions: dimensionOf(lot.dimension),
    status: lot.status,
    isFeatured: lot.isFeatured,
    imageUrl: lot.images[0]?.thumbnailUrl ?? lot.images[0]?.url ?? null,
    mediaCount: lot._count.images,
    documentCount: lot._count.documents,
    savedCount: lot._count.savedBy,
    category: lot.category?.name ?? lot.auction.category?.name ?? null,
    currency: lot.currency ?? lot.auction.currency,
    startingPrice: decimal(lot.startingPrice),
    reservePrice: decimal(lot.reservePrice),
    estimateLow: decimal(lot.estimateLow),
    estimateHigh: decimal(lot.estimateHigh),
    currentBid: Number(lot.bidCount) > 0 ? decimal(lot.currentBid) : null,
    bidCount: lot.bidCount.toString(),
    hammerPrice: decimal(lot.winner?.finalHammerPrice),
    scheduledStartAt: lot.scheduledStartAt,
    createdAt: lot.createdAt,
    auction: {
        uuid: lot.auction.uuid,
        title: lot.auction.title,
        status: lot.auction.status,
        visibility: lot.auction.visibility,
    },
});

// =====================================================================
// LIST
// =====================================================================

export const getArtworksService = async ({ search, auctionUuid, categoryUuid, stage, sort, page, limit }) => {
    const where = buildWhere({ search, auctionUuid, categoryUuid, stage });

    const [total, lots] = await prisma.$transaction([
        prisma.auctionItem.count({ where }),
        prisma.auctionItem.findMany({
            where,
            orderBy: SORTS[sort] ?? SORTS.newest,
            skip: (page - 1) * limit,
            take: limit,
            select: ARTWORK_SELECT,
        }),
    ]);

    // live lots: current bid / count straight from the bidding engine
    const live = await overlayLiveBids(lots);

    return {
        artworks: live.map(toRow),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
};

// =====================================================================
// SUMMARY (cards) + the auctions / categories to filter by
// =====================================================================

export const getArtworkSummaryService = async () => {
    const [byStatus, artistRows, soldLots, auctions, categories] = await Promise.all([
        prisma.auctionItem.groupBy({ by: ["status"], where: NOT_DELETED, _count: { _all: true } }),
        prisma.auctionItem.findMany({
            where: { ...NOT_DELETED, artistName: { not: null } },
            distinct: ["artistName"],
            select: { artistName: true },
        }),
        prisma.auctionItem.findMany({
            where: { ...NOT_DELETED, status: "SOLD" },
            select: {
                currentBid: true,
                winner: { select: { finalHammerPrice: true } },
                currency: { select: { code: true, symbol: true } },
                auction: { select: { currency: { select: { code: true, symbol: true } } } },
            },
        }),
        prisma.auction.findMany({
            where: { deletedAt: null, items: { some: {} } },
            orderBy: [{ startTime: "desc" }],
            select: { uuid: true, title: true, status: true },
        }),
        prisma.category.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { uuid: true, name: true },
        }),
    ]);

    const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
    const sum = (statuses) => statuses.reduce((total, status) => total + (counts[status] ?? 0), 0);

    const sold = sum(STAGE_LOT_STATUSES.sold);
    const unsold = sum(STAGE_LOT_STATUSES.unsold);

    // "Raza" and "raza " are the same artist
    const artists = new Set(artistRows.map((row) => row.artistName.trim().toLowerCase()).filter(Boolean));

    // hammer totals per currency (no FX conversion), biggest first. Older sales may have
    // no winner row — a sold lot's current bid is its hammer price then
    const hammer = new Map();
    for (const lot of soldLots) {
        const price = lot.winner?.finalHammerPrice ?? lot.currentBid;
        if (price === null) continue;
        const currency = lot.currency ?? lot.auction.currency;
        const entry = hammer.get(currency.code) ?? { currency, total: 0, lots: 0 };
        entry.total += Number(price);
        entry.lots += 1;
        hammer.set(currency.code, entry);
    }

    return serializeBigInt({
        totals: {
            total: Object.values(counts).reduce((a, b) => a + b, 0),
            artists: artists.size,
            upcoming: sum(STAGE_LOT_STATUSES.upcoming),
            live: sum(STAGE_LOT_STATUSES.live),
            sold,
            unsold,
            withdrawn: sum(STAGE_LOT_STATUSES.withdrawn),
            // of the lots that were offered and closed (withdrawn ones weren't offered)
            sellThroughRate: sold + unsold > 0 ? Math.round((sold / (sold + unsold)) * 100) : null,
        },
        hammerTotals: [...hammer.values()]
            .sort((a, b) => b.total - a.total)
            .map((entry) => ({ ...entry, total: (Math.round(entry.total * 100) / 100).toFixed(2) })),
        auctions,
        categories,
    });
};

// =====================================================================
// ONE ARTWORK (the details panel)
// =====================================================================

const USER_NAME_SELECT = {
    id: true,
    uuid: true,
    username: true,
    profile: { select: { firstName: true, lastName: true, displayName: true } },
};

/** Who leads a lot: the bidding engine's view while it has one (the database copy can be a tick behind) */
const leaderIdOf = async (lot) => {
    try {
        const id = await redis.hget(bidKeys.lot(lot.uuid), "leaderId");
        if (id) return BigInt(id);
    } catch (error) {
        console.error(`[artworks] live leader unavailable for lot ${lot.uuid}, using the saved one:`, error);
    }
    return lot.currentBidderId;
};

export const getArtworkService = async ({ lotUuid }) => {
    const lot = await prisma.auctionItem.findFirst({
        where: { uuid: lotUuid, ...NOT_DELETED },
        select: {
            ...ARTWORK_SELECT,
            description: true,
            provenance: true,
            conditionReport: true,
            overallCondition: true,
            frameCondition: true,
            detailedConditionNotes: true,
            restorationHistory: true,
            previousOwner: true,
            acquisitionMethod: true,
            acquisitionDate: true,
            exhibitionHistory: true,
            authenticateBy: true,
            auctheticateDate: true,
            insureanceValue: true,
            scheduledEndAt: true,
            updatedAt: true,
            currentBidderId: true,
            subCategory: { select: { name: true } },
            images: {
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                select: { url: true, thumbnailUrl: true, caption: true, mediaType: true, isPrimary: true },
            },
            documents: { select: { documentType: true, fileName: true, fileUrl: true, mimeType: true } },
            currentBidder: { select: USER_NAME_SELECT },
            winner: {
                select: {
                    finalHammerPrice: true,
                    buyerPremiumAmount: true,
                    totalAmountDue: true,
                    paymentStatus: true,
                    wonAt: true,
                    winner: { select: USER_NAME_SELECT },
                },
            },
            _count: { select: { images: true, documents: true, savedBy: true, bidders: true, autoBids: true } },
            auction: {
                select: {
                    id: true,
                    uuid: true,
                    title: true,
                    status: true,
                    visibility: true,
                    auctionType: true,
                    startTime: true,
                    endTime: true,
                    category: { select: { name: true } },
                    currency: { select: { code: true, symbol: true } },
                },
            },
        },
    });
    if (!lot) throw httpError("Artwork not found", 404);

    const [[live], verifiedBidders, leaderId] = await Promise.all([
        overlayLiveBids([lot]),
        prisma.lotBidder.count({ where: { itemId: lot.id, status: "VERIFIED" } }),
        leaderIdOf(lot),
    ]);

    // the buyer, or while the lot runs, who's leading — with their paddle in this sale
    let buyer = lot.winner?.winner ?? null;
    if (!buyer && Number(live.bidCount) > 0 && leaderId) {
        buyer = leaderId === lot.currentBidderId
            ? lot.currentBidder
            : await prisma.user.findUnique({ where: { id: leaderId }, select: USER_NAME_SELECT });
    }
    const participant = buyer
        ? await prisma.auctionParticipant.findUnique({
              where: { auctionId_userId: { auctionId: lot.auction.id, userId: buyer.id } },
              select: { paddleNumber: true },
          })
        : null;
    const person = buyer ? { uuid: buyer.uuid, name: displayName(buyer), paddle: participant?.paddleNumber ?? null } : null;

    const { auction } = lot;
    return serializeBigInt({
        ...toRow({ ...live, images: lot.images.filter((media) => media.mediaType === "IMAGE") }),
        subCategory: lot.subCategory?.name ?? null,
        description: lot.description,
        catalogue: {
            provenance: lot.provenance,
            exhibitionHistory: lot.exhibitionHistory,
            previousOwner: lot.previousOwner,
            acquisitionMethod: lot.acquisitionMethod,
            acquisitionDate: lot.acquisitionDate,
            authenticatedBy: lot.authenticateBy,
            authenticatedOn: lot.auctheticateDate,
        },
        condition: {
            overall: lot.overallCondition,
            frame: lot.frameCondition,
            report: lot.conditionReport,
            notes: lot.detailedConditionNotes,
            restoration: lot.restorationHistory,
        },
        insuranceValue: decimal(lot.insureanceValue),
        scheduledEndAt: lot.scheduledEndAt,
        updatedAt: lot.updatedAt,
        media: lot.images.map(({ url, thumbnailUrl, caption, mediaType }) => ({ url, thumbnailUrl, caption, mediaType })),
        documents: lot.documents,
        interest: {
            registeredBidders: lot._count.bidders,
            verifiedBidders,
            proxyBids: lot._count.autoBids,
            savedBy: lot._count.savedBy,
        },
        leader: lot.status === "SOLD" ? null : person,
        sale: lot.winner
            ? {
                  hammerPrice: decimal(lot.winner.finalHammerPrice),
                  buyerPremium: decimal(lot.winner.buyerPremiumAmount),
                  totalDue: decimal(lot.winner.totalAmountDue),
                  paymentStatus: lot.winner.paymentStatus,
                  wonAt: lot.winner.wonAt,
                  buyer: person,
              }
            : lot.status === "SOLD"
              ? {
                    // older sales have no winner row: the top bid / bidder is who it sold to
                    hammerPrice: Number(live.bidCount) > 0 ? decimal(live.currentBid) : null,
                    buyerPremium: null,
                    totalDue: null,
                    paymentStatus: null,
                    wonAt: null,
                    buyer: person,
                }
              : null,
        auction: {
            uuid: auction.uuid,
            title: auction.title,
            status: auction.status,
            visibility: auction.visibility,
            auctionType: auction.auctionType,
            startTime: auction.startTime,
            endTime: auction.endTime,
            category: auction.category?.name ?? null,
        },
    });
};
