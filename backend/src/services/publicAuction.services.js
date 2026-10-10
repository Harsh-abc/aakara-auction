import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { nextValidBid } from "../utils/bidIncrement.js";
import { getLiveLotView, overlayLiveBids } from "./bidding.services.js";

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
const PAST_STATUSES = ["ENDED", "SETTLED"];

const PUBLIC_VISIBILITIES = ["PUBLIC", "REGISTERED_USERS_ONLY"];

const publicWhere = (statuses) => ({
    deletedAt: null,
    status: { in: statuses },
    visibility: { in: PUBLIC_VISIBILITIES },
});

/**
 * Each list is a run of buckets, shown one after another, each with its own sort.
 * The scheduler (jobs/auctionScheduler.js) puts sales live at their start time and ends them (→ past)
 * at their end time, but a SCHEDULED sale
 * can still briefly sit past it (or stay there if its end time passed first) — those go after the
 * sales that genuinely open next. `hero: false` keeps a bucket out of the featured pick.
 */
const timelineBuckets = (type, now = new Date()) => {
    if (type === "past") return [{ where: publicWhere(PAST_STATUSES), orderBy: [{ endTime: "desc" }] }];

    return [
        // live now: LIVE before PAUSED, then the most recently started
        { where: publicWhere(LIVE_STATUSES), orderBy: [{ status: "asc" }, { startTime: "desc" }] },
        // opening next, soonest first
        { where: { ...publicWhere(UPCOMING_STATUSES), startTime: { gt: now } }, orderBy: [{ startTime: "asc" }] },
        // overdue but still within their window, latest-starting first
        {
            where: { ...publicWhere(UPCOMING_STATUSES), startTime: { lte: now }, endTime: { gt: now } },
            orderBy: [{ startTime: "desc" }],
        },
        // overdue and past their end time: never started, kept last
        {
            where: { ...publicWhere(UPCOMING_STATUSES), startTime: { lte: now }, endTime: { lte: now } },
            orderBy: [{ endTime: "desc" }],
            hero: false,
        },
    ];
};

const ALL_PUBLIC_STATUSES = [...LIVE_STATUSES, ...UPCOMING_STATUSES, ...PAST_STATUSES];

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
// The first entry of the upcoming list: live now, otherwise the next one to open
// =====================================================================

export const getFeaturedAuctionService = async () => {
    for (const { where, orderBy, hero = true } of timelineBuckets("upcoming")) {
        if (!hero) continue;
        const auction = await prisma.auction.findFirst({ where, orderBy, select: PUBLIC_AUCTION_SELECT });
        if (auction) return serializeBigInt(toPublicAuction(auction));
    }
    return null;
};

// =====================================================================
// UPCOMING / LIVE + PAST LISTS
// =====================================================================

export const getPublicAuctionsService = async ({ type, search, page, limit }) => {
    const searchFilter = search ? searchWhere(search) : {};
    const buckets = timelineBuckets(type).map((bucket) => ({ ...bucket, where: { ...bucket.where, ...searchFilter } }));

    const counts = await Promise.all(buckets.map(({ where }) => prisma.auction.count({ where })));
    const total = counts.reduce((sum, count) => sum + count, 0);

    // walk the buckets in order, taking this page's slice across them
    const auctions = [];
    let skip = (page - 1) * limit;
    for (const [index, { where, orderBy }] of buckets.entries()) {
        const remaining = limit - auctions.length;
        if (remaining === 0) break;
        if (skip >= counts[index]) {
            skip -= counts[index];
            continue;
        }
        auctions.push(...(await prisma.auction.findMany({ where, orderBy, skip, take: remaining, select: PUBLIC_AUCTION_SELECT })));
        skip = 0;
    }

    return serializeBigInt({
        auctions: auctions.map(toPublicAuction),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
};

// =====================================================================
// ONE AUCTION + ITS LOTS (storefront auction page)
// =====================================================================

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
    // terms are shown to bidders in the register dialog
    const auction = await findPublicAuction(auctionUuid, { ...PUBLIC_AUCTION_SELECT, description: true, termsAndConditions: true });
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
        lots: (await overlayLiveBids(lots)).map(({ images, currency, ...lot }) => ({
            ...lot,
            // lots without their own currency are priced in the sale's
            currency: currency ?? auction.currency,
            image: images[0] ? images[0].thumbnailUrl ?? images[0].url : null,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
};

// =====================================================================
// ONE LOT (storefront lot page)
// The lot with its bid ladder, plus the sale's order of sale for the sidebar
// =====================================================================

const PUBLIC_LOT_DETAIL_SELECT = {
    id: true,
    uuid: true,
    itemNumber: true,
    title: true,
    description: true,
    artistName: true,
    medium: true,
    yearCreated: true,
    editionType: true,
    provenance: true,
    previousOwner: true,
    acquisitionMethod: true,
    acquisitionDate: true,
    authenticateBy: true,
    auctheticateDate: true,
    overallCondition: true,
    frameCondition: true,
    conditionReport: true,
    detailedConditionNotes: true,
    restorationHistory: true,
    exhibitionHistory: true,
    category: { select: { name: true } },
    subCategory: { select: { name: true } },
    status: true,
    startingPrice: true,
    estimateLow: true,
    estimateHigh: true,
    currentBid: true,
    currentBidderId: true,
    bidCount: true,
    scheduledStartAt: true,
    scheduledEndAt: true,
    currency: { select: { code: true, symbol: true } },
    dimension: { select: { width: true, height: true, depth: true, dimensionUnit: true } },
    images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { url: true, thumbnailUrl: true, caption: true, mediaType: true },
    },
};

// bids that still count on the ladder
const LADDER_BID_STATUSES = ["PLACED", "WINNING", "OUTBID", "WON", "LOST"];
const LADDER_SIZE = 10;

const displayName = (user) => {
    const p = user?.profile;
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
    return p?.displayName || full || user?.username || null;
};

export const getPublicLotService = async ({ auctionUuid, lotUuid }) => {
    const { id: auctionId, creator, rules, ...auction } = await findPublicAuction(auctionUuid, {
        ...PUBLIC_AUCTION_SELECT,
        id: true,
        creator: { select: { username: true, profile: { select: { displayName: true, firstName: true, lastName: true } } } },
        rules: {
            where: { ruleType: "BID_INCREMENT", isActive: true },
            select: { valueType: true, rangeMin: true, rangeMax: true, value: true },
        },
    });

    // a lot from another sale reads as not found
    const lot = await prisma.auctionItem.findFirst({ where: { uuid: lotUuid, auctionId }, select: PUBLIC_LOT_DETAIL_SELECT });
    if (!lot) throw httpError("Lot not found", 404);

    // while the sale runs, bids live in Redis (written to the bids table once it ends)
    const live = await getLiveLotView(lot.uuid, LADDER_SIZE);

    const [lots, bids, leader] = await Promise.all([
        prisma.auctionItem.findMany({ where: { auctionId }, orderBy: LOT_ORDER.lot, select: PUBLIC_LOT_SELECT }).then(overlayLiveBids),
        live
            ? live.bids
            : prisma.bid.findMany({
                  where: { itemId: lot.id, status: { in: LADDER_BID_STATUSES } },
                  // equal amounts: the later row is the one that took the lead (an earlier proxy matching a bid)
                  orderBy: [{ amount: "desc" }, { placedAt: "desc" }, { id: "desc" }],
                  take: LADDER_SIZE,
                  select: { uuid: true, amount: true, source: true, placedAt: true },
              }),
        // bidders show by paddle number, never by name
        !live && lot.currentBidderId
            ? prisma.auctionParticipant.findUnique({
                  where: { auctionId_userId: { auctionId, userId: lot.currentBidderId } },
                  select: { paddleNumber: true },
              })
            : null,
    ]);

    const { id, currentBidderId, images, currency, category, subCategory, auctheticateDate, ...detail } = lot;

    return serializeBigInt({
        auction: { ...toPublicAuction(auction), auctioneer: displayName(creator) },
        lot: {
            ...detail,
            ...(live && { currentBid: live.currentBid, bidCount: live.bidCount }),
            authenticatedAt: auctheticateDate,
            // "type of artwork": the lot's own sub-category / category, else the sale's
            artworkType: subCategory?.name ?? category?.name ?? auction.category?.name ?? null,
            currency: currency ?? auction.currency,
            image: images.find((media) => media.mediaType === "IMAGE")?.url ?? null,
            media: images,
            leadingPaddle: live ? live.leadingPaddle : leader?.paddleNumber ?? null,
            nextBid: live ? live.nextBid : String(nextValidBid(lot, rules)),
            // highest first; the top one is the leading bid
            bids,
        },
        lots: lots.map(({ images: covers, currency: lotCurrency, ...summary }) => ({
            ...summary,
            currency: lotCurrency ?? auction.currency,
            image: covers[0] ? covers[0].thumbnailUrl ?? covers[0].url : null,
        })),
    });
};
