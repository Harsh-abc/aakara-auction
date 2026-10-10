import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { invalidateBidderAccess } from "./bidding.services.js";

// =====================================================================
// Lot bidders
//
// Users get a row on a lot only by registering for its auction (see
// auctionParticipant.services.js). This page lists those rows and lets a
// super admin verify / unverify them for this one lot.
// =====================================================================

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/** Roles that can register for an auction (themselves, or be added by a super admin). */
export const BIDDER_ROLES = ["BIDDER", "USER"];

/** Lot bidders can be verified / unverified until the auction is over. */
export const EDITABLE_AUCTION_STATUSES = ["DRAFT", "SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

/** Users can register for auctions only once published and until they're over. */
export const REGISTRATION_AUCTION_STATUSES = ["SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

const LOT_SUMMARY_SELECT = {
    id: true,
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
    scheduledStartAt: true,
    scheduledEndAt: true,
    currency: { select: { code: true, symbol: true } },
    images: {
        where: { mediaType: "IMAGE" },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { url: true, thumbnailUrl: true },
    },
    auction: { select: { uuid: true, title: true, status: true, deletedAt: true } },
};

const findLot = async (lotUuid) => {
    const lot = await prisma.auctionItem.findUnique({
        where: { uuid: lotUuid },
        select: LOT_SUMMARY_SELECT,
    });
    if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);
    return lot;
};

/**
 * Approves still-PENDING auction registrations (AuctionParticipant) — called
 * when a super admin verifies users on a lot. `auctionWhere` filters the
 * registration's auction, e.g. { auctionId } or { auction: { uuid } }.
 * Unverifying a lot never undoes it; permission to bid stays per lot.
 * (Registrations a super admin adds are approved when added.)
 */
export const approveRegistrations = (tx, auctionWhere, userIds, actorId) =>
    tx.auctionParticipant.updateMany({
        where: { ...auctionWhere, userId: { in: userIds }, status: "PENDING" },
        data: { status: "APPROVED", approvedAt: new Date(), approvedBy: BigInt(actorId) },
    });

const FILTERS = {
    all: {},
    verified: { status: "VERIFIED" },
    pending: { status: "PENDING" },
};

export const searchWhere = (search) =>
    search
        ? {
            OR: [
                { username: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
                { profile: { firstName: { contains: search, mode: "insensitive" } } },
                { profile: { lastName: { contains: search, mode: "insensitive" } } },
            ],
        }
        : {};

// =====================================================================
// GET LOT SUMMARY (top of the bidders page — loaded on its own so it
// still shows if the bidder list fails)
// =====================================================================

export const getLotSummaryService = async ({ lotUuid }) => {
    const lot = await findLot(lotUuid);

    // eslint-disable-next-line no-unused-vars
    const { id, images, auction: { deletedAt, ...auction }, ...lotFields } = lot;

    return serializeBigInt({
        ...lotFields,
        imageUrl: images[0]?.thumbnailUrl || images[0]?.url || null,
        auction,
    });
};

// =====================================================================
// GET LOT BIDDERS — users registered for this lot via its auction
// =====================================================================

export const getLotBiddersService = async ({ lotUuid, page, limit, search, filter }) => {
    const lot = await findLot(lotUuid);
    const itemId = lot.id;

    // the user's registration for this lot's auction (holds the paddle number)
    const thisAuction = { auction: { uuid: lot.auction.uuid } };

    const base = { itemId, user: { deletedAt: null } };
    const where = {
        AND: [
            base,
            FILTERS[filter],
            // paddle number (exact) or name / username / email / phone
            search
                ? {
                    OR: [
                        { user: { auctionParticipations: { some: { ...thisAuction, paddleNumber: search } } } },
                        { user: searchWhere(search) },
                    ],
                }
                : {},
        ],
    };

    // Independent reads — Promise.all (not $transaction) so they don't share one pg client
    const [total, rows, registeredCount, verifiedCount, pendingCount] = await Promise.all([
        prisma.lotBidder.count({ where }),
        prisma.lotBidder.findMany({
            where,
            select: {
                source: true,
                status: true,
                registeredAt: true,
                verifiedAt: true,
                verifier: { select: { username: true } },
                user: {
                    select: {
                        uuid: true,
                        username: true,
                        email: true,
                        phone: true,
                        createdAt: true,
                        role: { select: { name: true } },
                        profile: { select: { firstName: true, lastName: true, displayName: true, avatarUrl: true } },
                        kyc: { select: { status: true } },
                        auctionParticipations: { where: thisAuction, select: { paddleNumber: true } },
                    },
                },
            },
            orderBy: { registeredAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.lotBidder.count({ where: base }),
        prisma.lotBidder.count({ where: { ...base, status: "VERIFIED" } }),
        prisma.lotBidder.count({ where: { ...base, status: "PENDING" } }),
    ]);

    return serializeBigInt({
        bidders: rows.map(({ user: { profile, kyc, role, auctionParticipations, ...user }, verifier, ...registration }) => {
            const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
            return {
                ...user,
                // null only for legacy rows without an auction registration
                paddleNumber: auctionParticipations[0]?.paddleNumber ?? null,
                name: profile?.displayName || name || null,
                avatarUrl: profile?.avatarUrl ?? null,
                role: role.name,
                kycStatus: kyc?.status ?? "NOT_SUBMITTED",
                registration: { ...registration, verifiedBy: verifier?.username ?? null },
            };
        }),
        summary: { registered: registeredCount, verified: verifiedCount, pending: pendingCount },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
};

// =====================================================================
// VERIFY / UNVERIFY LOT BIDDERS (SUPER_ADMIN)
// =====================================================================

export const setLotBiddersVerifiedService = async ({ lotUuid, userUuids, verified, actorId }) => {
    if (!actorId) throw httpError("Authenticated user is required", 401);

    const lot = await findLot(lotUuid);
    if (!EDITABLE_AUCTION_STATUSES.includes(lot.auction.status)) {
        throw httpError(`Bidders can't be changed once the auction is ${lot.auction.status}`, 409);
    }

    const itemId = lot.id;
    const uniqueUuids = [...new Set(userUuids)];

    // Only users registered for this lot (through the auction) can be verified on it
    const users = await prisma.user.findMany({
        where: { uuid: { in: uniqueUuids }, deletedAt: null, lotBidders: { some: { itemId } } },
        select: { id: true, kyc: { select: { status: true } } },
    });
    if (users.length !== uniqueUuids.length) {
        const count = uniqueUuids.length - users.length;
        throw httpError(
            `${count} selected user${count === 1 ? " is" : "s are"} not registered for this lot. Register them for the auction first.`
        );
    }

    if (verified) {
        const noKyc = users.filter((u) => u.kyc?.status !== "VERIFIED").length;
        if (noKyc > 0) {
            throw httpError(
                `${noKyc} selected user${noKyc === 1 ? "" : "s"} can't be verified until their KYC is verified`
            );
        }
    }

    const userIds = users.map((u) => u.id);

    const changed = await prisma.$transaction(
        async (tx) => {
            const { count } = await tx.lotBidder.updateMany({
                where: { itemId, userId: { in: userIds }, status: verified ? "PENDING" : "VERIFIED" },
                data: verified
                    ? { status: "VERIFIED", verifiedAt: new Date(), verifiedBy: BigInt(actorId) }
                    : { status: "PENDING", verifiedAt: null, verifiedBy: null },
            });
            if (verified) await approveRegistrations(tx, { auction: { uuid: lot.auction.uuid } }, userIds, actorId);
            return count;
        },
        { maxWait: 10_000, timeout: 30_000 }
    );

    // live bidding re-reads who may bid on this lot
    await invalidateBidderAccess({ lotUuids: [lotUuid], revokedUserIds: verified ? [] : userIds });

    return { lotUuid, verified, requested: uniqueUuids.length, changed };
};
