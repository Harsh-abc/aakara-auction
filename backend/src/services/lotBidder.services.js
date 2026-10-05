import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { createUserByAdminService } from "./admin.services.js";

// =====================================================================
// Helpers
// =====================================================================

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/** Roles that can register for a lot themselves. */
export const BIDDER_ROLES = ["BIDDER", "USER"];

/** Users created by these roles are always listed on a lot's bidder page. */
const CREATOR_ROLES = ["SUPER_ADMIN", "ADMIN"];

const createdByAdminWhere = { createdBy: { role: { name: { in: CREATOR_ROLES } } } };

/** Lot bidders can be verified / unverified until the auction is over. */
const EDITABLE_AUCTION_STATUSES = ["DRAFT", "SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

/** Users can register for lots only on published, unfinished auctions. */
const REGISTRATION_AUCTION_STATUSES = ["SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

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
 * Users who appear on a lot's bidder list — KYC must be VERIFIED, and:
 *   - any bidder / user account,
 *   - any user created by a super admin / admin (any role), or
 *   - a user who registered for this lot themselves
 */
const eligibleUsersWhere = (itemId) => ({
    deletedAt: null,
    kyc: { is: { status: "VERIFIED" } },
    OR: [
        { role: { name: { in: BIDDER_ROLES } } },
        createdByAdminWhere,
        { lotBidders: { some: { itemId } } },
    ],
});

const FILTERS = {
    all: () => ({}),
    verified: (itemId) => ({ lotBidders: { some: { itemId, status: "VERIFIED" } } }),
    unverified: (itemId) => ({ NOT: { lotBidders: { some: { itemId, status: "VERIFIED" } } } }),
    registered: (itemId) => ({ lotBidders: { some: { itemId, source: "SELF_REGISTERED" } } }),
    created: () => createdByAdminWhere,
};

const searchWhere = (search) =>
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
// GET LOT BIDDERS
// =====================================================================

export const getLotBiddersService = async ({ lotUuid, page, limit, search, filter }) => {
    const lot = await findLot(lotUuid);
    const itemId = lot.id;

    const eligible = eligibleUsersWhere(itemId);
    const where = { AND: [eligible, FILTERS[filter](itemId), searchWhere(search)] };

    // Independent reads — Promise.all (not $transaction) so they don't share one pg client
    const [total, users, eligibleCount, verifiedCount, pendingRegistrations] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            select: {
                uuid: true,
                username: true,
                email: true,
                phone: true,
                createdAt: true,
                role: { select: { name: true } },
                profile: { select: { firstName: true, lastName: true, displayName: true, avatarUrl: true } },
                kyc: { select: { status: true } },
                createdBy: { select: { username: true, role: { select: { name: true } } } },
                lotBidders: {
                    where: { itemId },
                    select: {
                        source: true,
                        status: true,
                        registeredAt: true,
                        verifiedAt: true,
                        verifier: { select: { username: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.user.count({ where: eligible }),
        prisma.user.count({ where: { AND: [eligible, FILTERS.verified(itemId)] } }),
        // registrations from users whose KYC is verified (the only ones listed)
        prisma.lotBidder.count({
            where: { itemId, source: "SELF_REGISTERED", status: "PENDING", user: eligible },
        }),
    ]);

    return serializeBigInt({
        bidders: users.map(({ profile, kyc, createdBy, lotBidders, role, ...user }) => {
            const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
            const registration = lotBidders[0] ?? null;
            return {
                ...user,
                name: profile?.displayName || name || null,
                avatarUrl: profile?.avatarUrl ?? null,
                role: role.name,
                kycStatus: kyc?.status ?? "NOT_SUBMITTED",
                createdBy: createdBy ? { username: createdBy.username, role: createdBy.role.name } : null,
                registration: registration && {
                    source: registration.source,
                    status: registration.status,
                    registeredAt: registration.registeredAt,
                    verifiedAt: registration.verifiedAt,
                    verifiedBy: registration.verifier?.username ?? null,
                },
            };
        }),
        summary: { eligible: eligibleCount, verified: verifiedCount, pendingRegistrations },
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

    const uniqueUuids = [...new Set(userUuids)];
    // Eligibility includes KYC VERIFIED, so unverified-KYC users are rejected here
    const users = await prisma.user.findMany({
        where: { uuid: { in: uniqueUuids }, ...eligibleUsersWhere(lot.id) },
        select: { id: true },
    });
    if (users.length !== uniqueUuids.length) {
        const count = uniqueUuids.length - users.length;
        throw httpError(
            `${count} selected user${count === 1 ? " is" : "s are"} not eligible to bid on this lot (KYC must be verified)`
        );
    }

    const itemId = lot.id;
    const userIds = users.map((u) => u.id);

    const changed = await prisma.$transaction(
        async (tx) => {
            if (!verified) {
                const { count } = await tx.lotBidder.updateMany({
                    where: { itemId, userId: { in: userIds }, status: "VERIFIED" },
                    data: { status: "PENDING", verifiedAt: null, verifiedBy: null },
                });
                return count;
            }

            const verifiedData = { status: "VERIFIED", verifiedAt: new Date(), verifiedBy: BigInt(actorId) };

            // Registered users: approve their pending registration
            const { count: approved } = await tx.lotBidder.updateMany({
                where: { itemId, userId: { in: userIds }, status: "PENDING" },
                data: verifiedData,
            });

            // Dashboard-created users with no row yet: add them as verified
            const existing = await tx.lotBidder.findMany({
                where: { itemId, userId: { in: userIds } },
                select: { userId: true },
            });
            const hasRow = new Set(existing.map((row) => row.userId));
            const { count: added } = await tx.lotBidder.createMany({
                data: userIds
                    .filter((userId) => !hasRow.has(userId))
                    .map((userId) => ({ itemId, userId, source: "ADDED_BY_ADMIN", ...verifiedData })),
                skipDuplicates: true,
            });

            return approved + added;
        },
        { maxWait: 10_000, timeout: 30_000 }
    );

    return { lotUuid, verified, requested: uniqueUuids.length, changed };
};

// =====================================================================
// ADD A NEW USER TO A LOT (SUPER_ADMIN)
// Creates the account exactly like "Add User" (BIDDER, KYC verified,
// createdBy = actor) and adds them to the lot as a verified bidder, in
// one transaction.
// =====================================================================

export const addNewUserToLotService = async ({ lotUuid, user, actorId }) => {
    if (!actorId) throw httpError("Authenticated user is required", 401);

    const lot = await findLot(lotUuid);
    if (!EDITABLE_AUCTION_STATUSES.includes(lot.auction.status)) {
        throw httpError(`Bidders can't be added once the auction is ${lot.auction.status}`, 409);
    }

    try {
        const created = await createUserByAdminService(user, actorId, {
            afterCreate: (tx, newUser) =>
                tx.lotBidder.create({
                    data: {
                        itemId: lot.id,
                        userId: newUser.id,
                        source: "ADDED_BY_ADMIN",
                        status: "VERIFIED",
                        verifiedAt: new Date(),
                        verifiedBy: BigInt(actorId),
                    },
                }),
        });

        return serializeBigInt({ lotUuid, user: created });
    } catch (error) {
        // Existing account: point the admin at the list instead
        if (error.statusCode === 409) {
            error.message = `${error.message}. If they already have an account, find them in the list and click Verify.`;
        }
        throw error;
    }
};

// =====================================================================
// REGISTER FOR A LOT (bidder self-registration)
// =====================================================================

export const registerForLotService = async ({ lotUuid, userId, role }) => {
    if (!userId) throw httpError("Authenticated user is required", 401);
    if (!BIDDER_ROLES.includes(role)) throw httpError("Only bidder accounts can register for lots", 403);

    const lot = await findLot(lotUuid);
    if (!REGISTRATION_AUCTION_STATUSES.includes(lot.auction.status)) {
        throw httpError("Registration isn't open for this auction", 409);
    }
    if (lot.scheduledEndAt <= new Date()) {
        throw httpError("Bidding on this lot has already closed", 409);
    }

    // Idempotent: registering twice keeps the first registration
    const registration = await prisma.lotBidder.upsert({
        where: { itemId_userId: { itemId: lot.id, userId: BigInt(userId) } },
        create: { itemId: lot.id, userId: BigInt(userId), source: "SELF_REGISTERED" },
        update: {},
        select: { uuid: true, status: true, registeredAt: true, verifiedAt: true },
    });

    return serializeBigInt({ lotUuid, ...registration });
};
