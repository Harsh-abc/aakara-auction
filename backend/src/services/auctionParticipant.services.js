import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { createUserByAdminService } from "./admin.services.js";
import {
    BIDDER_ROLES,
    EDITABLE_AUCTION_STATUSES,
    REGISTRATION_AUCTION_STATUSES,
    approveRegistrations,
    searchWhere,
} from "./lotBidder.services.js";

// =====================================================================
// Auction registration
//
// A user registers for an auction (or a super admin adds them), which
// creates an AuctionParticipant row plus a PENDING LotBidder row on every
// lot of the auction. A super admin then verifies them per lot (lot
// bidders page) or on all lots at once (verify below). Only VERIFIED rows
// can bid.
// =====================================================================

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Users who can be added to an auction: KYC-verified bidder accounts (not team members). */
const addableUsersWhere = {
    deletedAt: null,
    role: { name: { in: BIDDER_ROLES } },
    kyc: { is: { status: "VERIFIED" } },
};

const USER_SELECT = {
    id: true,
    uuid: true,
    username: true,
    email: true,
    phone: true,
    role: { select: { name: true } },
    profile: { select: { firstName: true, lastName: true, displayName: true, avatarUrl: true } },
    kyc: { select: { status: true } },
};

const toUserSummary = ({ id, profile, kyc, role, ...user }) => {
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
    return {
        ...user,
        name: profile?.displayName || name || null,
        avatarUrl: profile?.avatarUrl ?? null,
        role: role.name,
        kycStatus: kyc?.status ?? "NOT_SUBMITTED",
    };
};

const findAuction = async (auctionUuid) => {
    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: {
            id: true,
            uuid: true,
            title: true,
            status: true,
            auctionType: true,
            visibility: true,
            coverImageUrl: true,
            startTime: true,
            endTime: true,
            registrationRequired: true,
            registrationStarts: true,
            registrationDeadline: true,
            deletedAt: true,
        },
    });
    if (!auction || auction.deletedAt) throw httpError("Auction not found", 404);
    return auction;
};

const assertEditable = (auction) => {
    if (!EDITABLE_AUCTION_STATUSES.includes(auction.status)) {
        throw httpError(`Registrations can't be changed once the auction is ${auction.status}`, 409);
    }
};

/** Looks up users by uuid; throws if any are missing or don't match `where`. */
const findUsersOrThrow = async (userUuids, where, notFoundMessage) => {
    const uniqueUuids = [...new Set(userUuids)];
    const users = await prisma.user.findMany({
        where: { uuid: { in: uniqueUuids }, ...where },
        select: { id: true, kyc: { select: { status: true } } },
    });
    if (users.length !== uniqueUuids.length) {
        const count = uniqueUuids.length - users.length;
        throw httpError(`${plural(count, "selected user")} ${notFoundMessage}`);
    }
    return users;
};

/**
 * Gives users a PENDING row on every lot of the auction. Existing rows
 * (e.g. already verified) are left alone. Returns how many rows were created.
 */
const addUsersToAllLots = async (tx, auctionId, users) => {
    if (users.length === 0) return 0;
    const lots = await tx.auctionItem.findMany({ where: { auctionId }, select: { id: true } });
    if (lots.length === 0) return 0;

    const { count } = await tx.lotBidder.createMany({
        data: users.flatMap(({ userId, source }) => lots.map((lot) => ({ itemId: lot.id, userId, source }))),
        skipDuplicates: true,
    });
    return count;
};

/** First paddle number of every auction. Must match the backfill in the paddle-numbers migration. */
const PADDLE_START = 101;

/**
 * Reserves `count` paddle numbers for the auction. The counter update locks
 * the auction row until the transaction ends, so concurrent registrations
 * can't be handed the same number. Numbers are never reused.
 */
const reservePaddleNumbers = async (tx, auctionId, count) => {
    const { paddleCounter } = await tx.auction.update({
        where: { id: auctionId },
        data: { paddleCounter: { increment: count } },
        select: { paddleCounter: true },
    });
    const first = PADDLE_START + paddleCounter - count;
    return Array.from({ length: count }, (_, i) => String(first + i));
};

/**
 * Registers users for the auction (if not already) and for all its lots.
 * A super admin adding someone (ADDED_BY_ADMIN, with `actorId`) approves the
 * registration on the spot; self-registrations stay PENDING until a super
 * admin first verifies them on a lot.
 */
const registerParticipants = async (tx, auctionId, userIds, source, actorId = null) => {
    const approval =
        source === "ADDED_BY_ADMIN" && actorId
            ? { status: "APPROVED", approvedAt: new Date(), approvedBy: BigInt(actorId) }
            : {};

    // Only new registrants get a paddle — existing ones keep theirs
    const existing = await tx.auctionParticipant.findMany({
        where: { auctionId, userId: { in: userIds } },
        select: { userId: true },
    });
    const registered = new Set(existing.map((p) => p.userId));
    const newUserIds = [...new Set(userIds)].filter((userId) => !registered.has(userId));

    let added = 0;
    if (newUserIds.length > 0) {
        const paddles = await reservePaddleNumbers(tx, auctionId, newUserIds.length);
        ({ count: added } = await tx.auctionParticipant.createMany({
            data: newUserIds.map((userId, i) => ({ auctionId, userId, source, paddleNumber: paddles[i], ...approval })),
            // a concurrent registration of the same user wins; its reserved paddle is just skipped
            skipDuplicates: true,
        }));
    }

    // Already-registered users keep their original source
    const participants = await tx.auctionParticipant.findMany({
        where: { auctionId, userId: { in: userIds } },
        select: { userId: true, source: true },
    });
    const lotRows = await addUsersToAllLots(tx, auctionId, participants);

    return { added, lotRows };
};

/**
 * Called after lots are added to an auction, so everyone already registered
 * for it is registered for the new lots too. Runs inside the caller's transaction.
 */
export const syncParticipantsToLots = async (tx, auctionId) => {
    const participants = await tx.auctionParticipant.findMany({
        where: { auctionId },
        select: { userId: true, source: true },
    });
    return addUsersToAllLots(tx, auctionId, participants);
};

// =====================================================================
// REGISTER FOR AN AUCTION (bidder self-registration)
// =====================================================================

export const registerForAuctionService = async ({ auctionUuid, userId }) => {
    if (!userId) throw httpError("Authenticated user is required", 401);

    // Read from the DB, not the token: KYC approval promotes USER → BIDDER
    // after the token was issued
    const account = await prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { role: { select: { name: true } }, kyc: { select: { status: true } } },
    });
    if (account?.role.name !== "BIDDER") throw httpError("Only bidder accounts can register for auctions", 403);
    if (account.kyc?.status !== "VERIFIED") {
        throw httpError("Your KYC must be verified before you can register for auctions", 403);
    }

    const auction = await findAuction(auctionUuid);
    if (!REGISTRATION_AUCTION_STATUSES.includes(auction.status)) {
        throw httpError("Registration isn't open for this auction", 409);
    }
    if (auction.visibility === "PRIVATE_INVITE_ONLY") {
        throw httpError("This auction is invite-only. Contact the auction house to be added.", 403);
    }

    const now = new Date();
    if (auction.registrationStarts && now < auction.registrationStarts) {
        throw httpError("Registration for this auction hasn't opened yet", 409);
    }
    if (auction.registrationDeadline && now > auction.registrationDeadline) {
        throw httpError("Registration for this auction has closed", 409);
    }

    const user = BigInt(userId);

    // Idempotent: registering again keeps the first registration and only
    // picks up lots added since
    const participant = await prisma.$transaction(
        async (tx) => {
            await registerParticipants(tx, auction.id, [user], "SELF_REGISTERED");
            return tx.auctionParticipant.findUnique({
                where: { auctionId_userId: { auctionId: auction.id, userId: user } },
                select: { paddleNumber: true, source: true, registeredAt: true },
            });
        },
        { maxWait: 10_000, timeout: 30_000 }
    );

    const lots = await prisma.lotBidder.findMany({
        where: { userId: user, item: { auctionId: auction.id } },
        select: { status: true, item: { select: { uuid: true, itemNumber: true, title: true } } },
        orderBy: { item: { itemNumber: "asc" } },
    });

    return serializeBigInt({
        auctionUuid,
        ...participant,
        lots: lots.map(({ status, item }) => ({ lotUuid: item.uuid, itemNumber: item.itemNumber, title: item.title, status })),
    });
};

// =====================================================================
// LIST AUCTION REGISTRATIONS (SUPER_ADMIN / ADMIN)
// =====================================================================

const PARTICIPANT_FILTERS = {
    all: () => ({}),
    awaiting: (auctionId) => ({
        user: { lotBidders: { some: { status: "PENDING", item: { auctionId } } } },
    }),
    self: () => ({ source: "SELF_REGISTERED" }),
    admin: () => ({ source: "ADDED_BY_ADMIN" }),
};

export const getAuctionParticipantsService = async ({ auctionUuid, page, limit, search, filter }) => {
    const auction = await findAuction(auctionUuid);
    const auctionId = auction.id;

    const base = { auctionId };
    const where = {
        AND: [
            base,
            PARTICIPANT_FILTERS[filter](auctionId),
            // paddle number (exact) or name / username / email / phone
            search ? { OR: [{ paddleNumber: search }, { user: searchWhere(search) }] } : {},
        ],
    };

    const [lots, lotCounts, total, participants, totalCount, selfCount, adminCount, awaitingCount] = await Promise.all([
        prisma.auctionItem.findMany({
            where: { auctionId },
            select: {
                id: true,
                uuid: true,
                itemNumber: true,
                title: true,
                artistName: true,
                status: true,
                scheduledStartAt: true,
                scheduledEndAt: true,
                images: {
                    where: { mediaType: "IMAGE" },
                    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                    take: 1,
                    select: { url: true, thumbnailUrl: true },
                },
            },
            orderBy: { itemNumber: "asc" },
        }),
        // registered / verified / pending per lot
        prisma.lotBidder.groupBy({
            by: ["itemId", "status"],
            where: { item: { auctionId }, user: { deletedAt: null } },
            _count: { _all: true },
        }),
        prisma.auctionParticipant.count({ where }),
        prisma.auctionParticipant.findMany({
            where,
            select: {
                paddleNumber: true,
                source: true,
                status: true,
                registeredAt: true,
                approvedAt: true,
                approver: { select: { username: true } },
                user: {
                    select: {
                        ...USER_SELECT,
                        lotBidders: {
                            where: { item: { auctionId } },
                            select: { itemId: true, status: true },
                        },
                    },
                },
            },
            orderBy: { registeredAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.auctionParticipant.count({ where: base }),
        prisma.auctionParticipant.count({ where: { ...base, source: "SELF_REGISTERED" } }),
        prisma.auctionParticipant.count({ where: { ...base, source: "ADDED_BY_ADMIN" } }),
        prisma.auctionParticipant.count({ where: { AND: [base, PARTICIPANT_FILTERS.awaiting(auctionId)] } }),
    ]);

    const lotUuidById = new Map(lots.map((lot) => [lot.id, lot.uuid]));
    const countFor = (itemId, status) =>
        lotCounts.find((row) => row.itemId === itemId && row.status === status)?._count._all ?? 0;

    // eslint-disable-next-line no-unused-vars
    const { id, deletedAt, ...auctionFields } = auction;

    return serializeBigInt({
        auction: auctionFields,
        lots: lots.map(({ id: itemId, images, ...lot }) => {
            const verified = countFor(itemId, "VERIFIED");
            const pending = countFor(itemId, "PENDING");
            return {
                ...lot,
                imageUrl: images[0]?.thumbnailUrl || images[0]?.url || null,
                bidders: { registered: verified + pending, verified, pending },
            };
        }),
        participants: participants.map(({ user: { lotBidders, ...user }, approver, ...participant }) => ({
            ...toUserSummary(user),
            ...participant,
            approvedBy: approver?.username ?? null,
            // only lots the user has a row on; missing lot = not registered for it
            lots: lotBidders.map((row) => ({ lotUuid: lotUuidById.get(row.itemId), status: row.status })),
        })),
        summary: { total: totalCount, selfRegistered: selfCount, addedByAdmin: adminCount, awaiting: awaitingCount },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
};

// =====================================================================
// SEARCH USERS TO ADD (SUPER_ADMIN) — not yet registered for the auction
// =====================================================================

export const getParticipantCandidatesService = async ({ auctionUuid, search, limit }) => {
    const auction = await findAuction(auctionUuid);

    const users = await prisma.user.findMany({
        where: {
            AND: [
                addableUsersWhere,
                { NOT: { auctionParticipations: { some: { auctionId: auction.id } } } },
                searchWhere(search),
            ],
        },
        select: USER_SELECT,
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    return serializeBigInt(users.map(toUserSummary));
};

// =====================================================================
// ADD EXISTING USERS TO AN AUCTION (SUPER_ADMIN)
// =====================================================================

export const addAuctionParticipantsService = async ({ auctionUuid, userUuids, actorId }) => {
    if (!actorId) throw httpError("Authenticated user is required", 401);

    const auction = await findAuction(auctionUuid);
    assertEditable(auction);

    const users = await findUsersOrThrow(userUuids, addableUsersWhere, "can't be added (KYC-verified bidder accounts only)");

    const { added, lotRows } = await prisma.$transaction(
        (tx) =>
            registerParticipants(
                tx,
                auction.id,
                users.map((u) => u.id),
                "ADDED_BY_ADMIN",
                actorId
            ),
        { maxWait: 10_000, timeout: 30_000 }
    );

    return { auctionUuid, requested: users.length, added, alreadyRegistered: users.length - added, lotRows };
};

// =====================================================================
// CREATE A NEW USER AND ADD THEM TO AN AUCTION (SUPER_ADMIN)
// Creates the account exactly like "Add User" and registers them for the
// auction and all its lots (PENDING — still verified per lot), in one
// transaction.
// =====================================================================

export const addNewUserToAuctionService = async ({ auctionUuid, user, actorId }) => {
    if (!actorId) throw httpError("Authenticated user is required", 401);

    const auction = await findAuction(auctionUuid);
    assertEditable(auction);

    try {
        let paddleNumber = null;
        const created = await createUserByAdminService(user, actorId, {
            afterCreate: async (tx, newUser) => {
                await registerParticipants(tx, auction.id, [newUser.id], "ADDED_BY_ADMIN", actorId);
                ({ paddleNumber } = await tx.auctionParticipant.findUnique({
                    where: { auctionId_userId: { auctionId: auction.id, userId: newUser.id } },
                    select: { paddleNumber: true },
                }));
            },
        });

        return serializeBigInt({ auctionUuid, paddleNumber, user: created });
    } catch (error) {
        // Existing account: point the admin at "Add Existing User" instead
        if (error.statusCode === 409) {
            error.message = `${error.message}. If they already have an account, use "Add Existing User".`;
        }
        throw error;
    }
};

// =====================================================================
// VERIFY / UNVERIFY ON ALL LOTS OF THE AUCTION (SUPER_ADMIN)
// =====================================================================

export const setParticipantsVerifiedService = async ({ auctionUuid, userUuids, verified, actorId }) => {
    if (!actorId) throw httpError("Authenticated user is required", 401);

    const auction = await findAuction(auctionUuid);
    assertEditable(auction);

    const users = await findUsersOrThrow(
        userUuids,
        { auctionParticipations: { some: { auctionId: auction.id } } },
        "not registered for this auction"
    );

    if (verified) {
        const noKyc = users.filter((u) => u.kyc?.status !== "VERIFIED").length;
        if (noKyc > 0) {
            throw httpError(`${plural(noKyc, "selected user")} can't be verified until their KYC is verified`);
        }
    }

    const userIds = users.map((u) => u.id);
    const auctionLots = { auctionId: auction.id };

    const changed = await prisma.$transaction(
        async (tx) => {
            if (!verified) {
                const { count } = await tx.lotBidder.updateMany({
                    where: { userId: { in: userIds }, status: "VERIFIED", item: auctionLots },
                    data: { status: "PENDING", verifiedAt: null, verifiedBy: null },
                });
                return count;
            }

            // Lots added since they registered get a row first
            const participants = await tx.auctionParticipant.findMany({
                where: { auctionId: auction.id, userId: { in: userIds } },
                select: { userId: true, source: true },
            });
            await addUsersToAllLots(tx, auction.id, participants);

            const { count } = await tx.lotBidder.updateMany({
                where: { userId: { in: userIds }, status: "PENDING", item: auctionLots },
                data: { status: "VERIFIED", verifiedAt: new Date(), verifiedBy: BigInt(actorId) },
            });
            await approveRegistrations(tx, { auctionId: auction.id }, userIds, actorId);
            return count;
        },
        { maxWait: 10_000, timeout: 30_000 }
    );

    return { auctionUuid, verified, requested: users.length, changed };
};

// =====================================================================
// REMOVE FROM AN AUCTION (SUPER_ADMIN)
// Deletes the registration and the user's rows on every lot of the
// auction, so they can no longer bid on any of them. Bids already placed
// are kept.
// =====================================================================

export const removeAuctionParticipantsService = async ({ auctionUuid, userUuids, actorId }) => {
    if (!actorId) throw httpError("Authenticated user is required", 401);

    const auction = await findAuction(auctionUuid);
    assertEditable(auction);

    const users = await findUsersOrThrow(
        userUuids,
        { auctionParticipations: { some: { auctionId: auction.id } } },
        "not registered for this auction"
    );
    const userIds = users.map((u) => u.id);

    const removed = await prisma.$transaction(
        async (tx) => {
            await tx.lotBidder.deleteMany({ where: { userId: { in: userIds }, item: { auctionId: auction.id } } });
            const { count } = await tx.auctionParticipant.deleteMany({
                where: { auctionId: auction.id, userId: { in: userIds } },
            });
            return count;
        },
        { maxWait: 10_000, timeout: 30_000 }
    );

    return { auctionUuid, removed };
};
