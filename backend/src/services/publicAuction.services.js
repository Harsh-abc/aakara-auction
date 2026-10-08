import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/**
 * Storefront (no login) reads. Invite-only and unpublished sales never show up here.
 *   upcoming = live right now, or published and not started yet
 *   past     = finished (cancelled sales are left out)
 */
const LIVE_STATUSES = ["LIVE", "PAUSED"];
const UPCOMING_STATUSES = ["SCHEDULED", "PREVIEW"];

export const PUBLIC_TIMELINE = {
    // live sales started earlier than anything still to come, so start time puts them first
    upcoming: { statuses: [...LIVE_STATUSES, ...UPCOMING_STATUSES], orderBy: [{ startTime: "asc" }] },
    past: { statuses: ["ENDED", "SETTLED"], orderBy: [{ endTime: "desc" }] },
};

const PUBLIC_VISIBILITIES = ["PUBLIC", "REGISTERED_USERS_ONLY"];

const publicWhere = (statuses) => ({
    deletedAt: null,
    status: { in: statuses },
    visibility: { in: PUBLIC_VISIBILITIES },
});

const PUBLIC_AUCTION_SELECT = {
    uuid: true,
    title: true,
    slug: true,
    short_description: true,
    coverImageUrl: true,
    status: true,
    auctionType: true,
    startTime: true,
    endTime: true,
    timezone: true,
    isOnline: true,
    venue: true,
    registrationRequired: true,
    registrationStarts: true,
    registrationDeadline: true,
    category: { select: { name: true } },
    currency: { select: { code: true, symbol: true } },
    _count: { select: { items: true } },
};

const toPublicAuction = ({ _count, ...auction }) => ({ ...auction, lotCount: _count.items });

// matches the sale itself, or any lot in it by title, artist or lot number
const searchWhere = (search) => {
    const lotMatch = [
        { title: { contains: search, mode: "insensitive" } },
        { artistName: { contains: search, mode: "insensitive" } },
    ];
    if (/^\d{1,9}$/.test(search)) lotMatch.push({ itemNumber: BigInt(search) });

    return {
        OR: [
            { title: { contains: search, mode: "insensitive" } },
            { short_description: { contains: search, mode: "insensitive" } },
            { venue: { contains: search, mode: "insensitive" } },
            { category: { name: { contains: search, mode: "insensitive" } } },
            { items: { some: { OR: lotMatch } } },
        ],
    };
};

// =====================================================================
// FEATURED (HERO) AUCTION
// The sale that's live now, otherwise the next one to open
// =====================================================================

export const getFeaturedAuctionService = async () => {
    const live = await prisma.auction.findFirst({
        where: publicWhere(LIVE_STATUSES),
        // LIVE before PAUSED, then the most recently started
        orderBy: [{ status: "asc" }, { startTime: "desc" }],
        select: PUBLIC_AUCTION_SELECT,
    });
    if (live) return serializeBigInt(toPublicAuction(live));

    const next = await prisma.auction.findFirst({
        where: publicWhere(UPCOMING_STATUSES),
        orderBy: [{ startTime: "asc" }],
        select: PUBLIC_AUCTION_SELECT,
    });
    return next ? serializeBigInt(toPublicAuction(next)) : null;
};

// =====================================================================
// UPCOMING / LIVE + PAST LISTS
// =====================================================================

export const getPublicAuctionsService = async ({ type, search, page, limit }) => {
    const { statuses, orderBy } = PUBLIC_TIMELINE[type];
    const where = { ...publicWhere(statuses), ...(search && searchWhere(search)) };

    const [total, auctions] = await Promise.all([
        prisma.auction.count({ where }),
        prisma.auction.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: PUBLIC_AUCTION_SELECT,
        }),
    ]);

    return serializeBigInt({
        auctions: auctions.map(toPublicAuction),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
};

// =====================================================================
// ONE AUCTION + ITS LOTS (storefront auction page)
// =====================================================================

const ALL_PUBLIC_STATUSES = [...PUBLIC_TIMELINE.upcoming.statuses, ...PUBLIC_TIMELINE.past.statuses];

// invite-only, draft or cancelled sales read as "not found" rather than leaking that they exist
const findPublicAuction = async (auctionUuid, select) => {
    const auction = await prisma.auction.findFirst({
        where: { uuid: auctionUuid, ...publicWhere(ALL_PUBLIC_STATUSES) },
        select,
    });
    if (!auction) throw httpError("Auction not found", 404);
    return auction;
};

export const getPublicAuctionService = async ({ auctionUuid }) => {
    const auction = await findPublicAuction(auctionUuid, { ...PUBLIC_AUCTION_SELECT, description: true });
    return serializeBigInt(toPublicAuction(auction));
};

const LOT_ORDER = {
    lot: [{ itemNumber: "asc" }],
    "estimate-asc": [{ estimateLow: { sort: "asc", nulls: "last" } }, { itemNumber: "asc" }],
    "estimate-desc": [{ estimateHigh: { sort: "desc", nulls: "last" } }, { itemNumber: "asc" }],
    "bid-desc": [{ currentBid: { sort: "desc", nulls: "last" } }, { itemNumber: "asc" }],
};

const PUBLIC_LOT_SELECT = {
    uuid: true,
    itemNumber: true,
    title: true,
    artistName: true,
    medium: true,
    yearCreated: true,
    status: true,
    startingPrice: true,
    estimateLow: true,
    estimateHigh: true,
    currentBid: true,
    bidCount: true,
    scheduledStartAt: true,
    scheduledEndAt: true,
    currency: { select: { code: true, symbol: true } },
    dimension: { select: { width: true, height: true, depth: true, dimensionUnit: true } },
    // the cover: primary image first, then the gallery order (videos can't be a thumbnail)
    images: {
        where: { mediaType: "IMAGE" },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { url: true, thumbnailUrl: true },
    },
};

export const getPublicLotsService = async ({ auctionUuid, search, sort, page, limit }) => {
    const auction = await findPublicAuction(auctionUuid, { id: true, currency: { select: { code: true, symbol: true } } });

    const where = { auctionId: auction.id };
    if (search) {
        where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { artistName: { contains: search, mode: "insensitive" } },
            { medium: { contains: search, mode: "insensitive" } },
            ...(/^\d{1,9}$/.test(search) ? [{ itemNumber: BigInt(search) }] : []),
        ];
    }

    const [total, lots] = await Promise.all([
        prisma.auctionItem.count({ where }),
        prisma.auctionItem.findMany({
            where,
            orderBy: LOT_ORDER[sort],
            skip: (page - 1) * limit,
            take: limit,
            select: PUBLIC_LOT_SELECT,
        }),
    ]);

    return serializeBigInt({
        lots: lots.map(({ images, currency, ...lot }) => ({
            ...lot,
            // lots without their own currency are priced in the sale's
            currency: currency ?? auction.currency,
            image: images[0] ? images[0].thumbnailUrl ?? images[0].url : null,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
};
