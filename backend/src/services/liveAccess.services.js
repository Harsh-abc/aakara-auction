import prisma from "../libs/prisma.js";
import { clearLiveAccessCache, LIVE_STATUSES } from "../libs/liveAccess.js";
import { isLivekitConfigured, liveRoomName, roomService } from "../libs/livekit.js";
import { ejectHiddenViewers } from "../libs/socket.js";
import { serializeBigInt } from "../utils/serialize.js";
import { BIDDER_ROLES, searchWhere } from "./lotBidder.services.js";

// =====================================================================
// Settings → Live Access (super admin). Per auction: a switch that, while the
// sale is LIVE / PAUSED, hides it from everyone but staff and the bidders
// picked here. The rule itself is in libs/liveAccess.js.
// =====================================================================

const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

// sales that are coming up or running — the ones a restriction can matter for
const MANAGEABLE_STATUSES = ["DRAFT", "SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

const MAX_VIEWERS_PER_REQUEST = 200;

const USER_SELECT = {
    id: true,
    uuid: true,
    username: true,
    email: true,
    phone: true,
    profile: { select: { firstName: true, lastName: true, displayName: true, avatarUrl: true } },
};

const personName = (user) =>
    user?.profile?.displayName || [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(" ") || user?.username || null;

const toPerson = ({ id, profile, ...user }) => ({ ...user, name: personName({ ...user, profile }), avatarUrl: profile?.avatarUrl ?? null });

// accounts that can be picked: bidders who can sign in
const pickableUsersWhere = { deletedAt: null, status: "ACTIVE", role: { name: { in: BIDDER_ROLES } } };

const findAuction = async (auctionUuid) => {
    const auction = await prisma.auction.findFirst({
        where: { uuid: auctionUuid, deletedAt: null },
        select: { id: true, uuid: true, title: true, status: true, liveAccessRestricted: true },
    });
    if (!auction) throw httpError("Auction not found", 404);
    return auction;
};

/**
 * Closes the sale to every open tab and live-video viewer that may no longer see it.
 * Not awaited by callers that don't need it; failures are logged.
 */
export const enforceLiveAccess = async (auctionUuid) => {
    clearLiveAccessCache();
    try {
        const auction = await prisma.auction.findFirst({
            where: { uuid: auctionUuid, deletedAt: null },
            select: { id: true, status: true, liveAccessRestricted: true },
        });
        if (!auction?.liveAccessRestricted || !LIVE_STATUSES.includes(auction.status)) return;

        const tabs = await ejectHiddenViewers(auctionUuid);
        const videos = await removeHiddenStreamViewers(auctionUuid, auction.id);
        if (tabs || videos) console.info(`[live-access] closed auction ${auctionUuid} to ${tabs} tab(s) and ${videos} video viewer(s)`);
    } catch (error) {
        console.error(`[live-access] could not enforce live access for auction ${auctionUuid}:`, error?.message);
    }
};

// bidders join the stream as "user-<uuid>" (liveStream.services.js); staff are tagged kind "staff"
const removeHiddenStreamViewers = async (auctionUuid, auctionId) => {
    if (!isLivekitConfigured()) return 0;
    const room = liveRoomName(auctionUuid);

    let participants;
    try {
        participants = await roomService().listParticipants(room);
    } catch {
        return 0; // no room yet — nobody is watching
    }

    const bidderUuids = participants
        .filter((p) => p.identity.startsWith("user-"))
        .filter((p) => {
            try {
                return JSON.parse(p.metadata || "{}").kind !== "staff";
            } catch {
                return true;
            }
        })
        .map((p) => p.identity.slice("user-".length));
    if (!bidderUuids.length) return 0;

    const allowed = await prisma.auctionLiveViewer.findMany({
        where: { auctionId, user: { uuid: { in: bidderUuids } } },
        select: { user: { select: { uuid: true } } },
    });
    const allowedUuids = new Set(allowed.map((row) => row.user.uuid));

    let removed = 0;
    for (const uuid of bidderUuids) {
        if (allowedUuids.has(uuid)) continue;
        try {
            await roomService().removeParticipant(room, `user-${uuid}`);
            removed += 1;
        } catch (error) {
            console.error(`[live-access] could not remove viewer user-${uuid} from the stream:`, error?.message);
        }
    }
    return removed;
};

// =====================================================================
// READS
// =====================================================================

/** Upcoming and running sales with their switch and how many bidders are picked. */
export const listLiveAccessAuctionsService = async () => {
    const auctions = await prisma.auction.findMany({
        where: { deletedAt: null, status: { in: MANAGEABLE_STATUSES } },
        orderBy: [{ startTime: "asc" }],
        select: {
            uuid: true,
            title: true,
            status: true,
            startTime: true,
            endTime: true,
            coverImageUrl: true,
            thumbnailImageUrl: true,
            liveAccessRestricted: true,
            _count: { select: { liveViewers: true } },
        },
    });
    // running sales first — they're the ones the switch affects right now
    const rank = (status) => (LIVE_STATUSES.includes(status) ? 0 : 1);
    return serializeBigInt(
        auctions
            .sort((a, b) => rank(a.status) - rank(b.status))
            .map(({ _count, thumbnailImageUrl, coverImageUrl, ...auction }) => ({
                ...auction,
                imageUrl: thumbnailImageUrl ?? coverImageUrl ?? null,
                viewerCount: _count.liveViewers,
            }))
    );
};

/** The bidders picked for one sale, with their paddle number when they're registered for it. */
export const getLiveViewersService = async ({ auctionUuid }) => {
    const auction = await findAuction(auctionUuid);
    const rows = await prisma.auctionLiveViewer.findMany({
        where: { auctionId: auction.id },
        orderBy: { createdAt: "desc" },
        select: {
            createdAt: true,
            user: {
                select: {
                    ...USER_SELECT,
                    auctionParticipations: { where: { auctionId: auction.id }, select: { paddleNumber: true } },
                },
            },
            addedBy: { select: { username: true, profile: { select: { firstName: true, lastName: true, displayName: true } } } },
        },
    });

    return serializeBigInt({
        auction: { uuid: auction.uuid, title: auction.title, status: auction.status, liveAccessRestricted: auction.liveAccessRestricted },
        viewers: rows.map(({ createdAt, addedBy, user: { auctionParticipations, ...user } }) => ({
            ...toPerson(user),
            paddleNumber: auctionParticipations[0]?.paddleNumber ?? null,
            addedAt: createdAt,
            addedBy: addedBy ? personName(addedBy) : null,
        })),
    });
};

/** Bidders not yet picked for the sale, matching `search`; registered bidders for it first. */
export const searchLiveViewerCandidatesService = async ({ auctionUuid, search, limit }) => {
    const auction = await findAuction(auctionUuid);
    const users = await prisma.user.findMany({
        where: {
            AND: [pickableUsersWhere, { liveAuctionAccess: { none: { auctionId: auction.id } } }, search ? searchWhere(search) : {}],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { ...USER_SELECT, auctionParticipations: { where: { auctionId: auction.id }, select: { paddleNumber: true } } },
    });

    return serializeBigInt(
        users
            .map(({ auctionParticipations, ...user }) => ({ ...toPerson(user), paddleNumber: auctionParticipations[0]?.paddleNumber ?? null }))
            .sort((a, b) => Number(b.paddleNumber !== null) - Number(a.paddleNumber !== null))
    );
};

// =====================================================================
// CHANGES
// =====================================================================

/** Switches the restriction on / off for one sale. */
export const setLiveAccessRestrictedService = async ({ auctionUuid, restricted }) => {
    const auction = await findAuction(auctionUuid);
    if (!MANAGEABLE_STATUSES.includes(auction.status)) throw httpError("Only upcoming or running auctions can be restricted", 409);

    await prisma.auction.update({ where: { id: auction.id }, data: { liveAccessRestricted: restricted } });
    if (restricted) await enforceLiveAccess(auctionUuid);
    else clearLiveAccessCache();

    return { auction: { uuid: auction.uuid, title: auction.title, status: auction.status, liveAccessRestricted: restricted } };
};

/** Picks bidders for the sale; those already picked are skipped. */
export const addLiveViewersService = async ({ auctionUuid, userUuids, actorId }) => {
    const auction = await findAuction(auctionUuid);
    const uuids = [...new Set(userUuids)];
    if (!uuids.length) throw httpError("Pick at least one bidder");
    if (uuids.length > MAX_VIEWERS_PER_REQUEST) throw httpError(`Add at most ${MAX_VIEWERS_PER_REQUEST} bidders at a time`);

    const users = await prisma.user.findMany({ where: { uuid: { in: uuids }, ...pickableUsersWhere }, select: { id: true } });
    if (users.length !== uuids.length) {
        const missing = uuids.length - users.length;
        throw httpError(`${missing} of the selected ${missing === 1 ? "user isn't an active bidder" : "users aren't active bidders"}`);
    }

    const { count } = await prisma.auctionLiveViewer.createMany({
        data: users.map((user) => ({ auctionId: auction.id, userId: user.id, addedById: actorId ? BigInt(actorId) : null })),
        skipDuplicates: true,
    });
    clearLiveAccessCache();
    return { auction: { uuid: auction.uuid, title: auction.title }, added: count, alreadyAdded: users.length - count };
};

/** Takes one bidder off the sale's list; while it's live and restricted, their open tabs close to it. */
export const removeLiveViewerService = async ({ auctionUuid, userUuid }) => {
    const auction = await findAuction(auctionUuid);
    const user = await prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true, ...USER_SELECT } });
    if (!user) throw httpError("User not found", 404);

    const { count } = await prisma.auctionLiveViewer.deleteMany({ where: { auctionId: auction.id, userId: user.id } });
    if (!count) throw httpError("That bidder isn't on this auction's list", 404);

    await enforceLiveAccess(auctionUuid);
    return { auction: { uuid: auction.uuid, title: auction.title }, user: toPerson(user) };
};
