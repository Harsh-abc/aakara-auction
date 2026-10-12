import { AccessToken } from "livekit-server-sdk";

import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import {
    HOST_PREFIX,
    auctionUuidFromRoom,
    isLivekitConfigured,
    liveRoomName,
    livekitConfig,
    roomService,
} from "../libs/livekit.js";

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

// the stream is only open while the sale runs
const STREAM_STATUSES = ["LIVE", "PAUSED"];
// storefront viewers can't watch invite-only sales
const PUBLIC_VISIBILITIES = ["PUBLIC", "REGISTERED_USERS_ONLY"];

const VIEWER_TOKEN_TTL = "6h";
const HOST_TOKEN_TTL = "8h";

const displayName = (user) => {
    const profile = user?.profile;
    const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
    return profile?.displayName || full || user?.username || null;
};

const USER_NAME_SELECT = {
    uuid: true,
    username: true,
    profile: { select: { firstName: true, lastName: true, displayName: true } },
};

const findUser = (userId) =>
    userId ? prisma.user.findFirst({ where: { id: BigInt(userId), deletedAt: null }, select: USER_NAME_SELECT }) : null;

const findStreamAuction = async (auctionUuid, where = {}) => {
    const auction = await prisma.auction.findFirst({
        where: { uuid: auctionUuid, deletedAt: null, ...where },
        select: { id: true, title: true, status: true },
    });
    if (!auction) throw httpError("Auction not found", 404);
    return auction;
};

// =====================================================================
// VIEWER TOKEN — watch-only access to the auction's live room
// Signed-in users join as "user-<uuid>" with their name; guests as "viewer-<id>"
// (a stable id from the browser, so the studio can remove / ban them)
// =====================================================================

export const createViewerTokenService = async ({ auctionUuid, viewerId, userId, userAgent }) => {
    const { url, apiKey, apiSecret } = livekitConfig();

    const auction = await findStreamAuction(auctionUuid, { visibility: { in: PUBLIC_VISIBILITIES } });
    if (!STREAM_STATUSES.includes(auction.status)) throw httpError("The live stream is not on right now", 409);

    const user = await findUser(userId);
    const identity = user ? `user-${user.uuid}` : `viewer-${viewerId}`;

    const banned = await prisma.liveStreamBan.findUnique({
        where: { auctionId_identity: { auctionId: auction.id, identity } },
        select: { id: true },
    });
    if (banned) throw httpError("You have been removed from this live stream", 403);

    const token = new AccessToken(apiKey, apiSecret, {
        identity,
        name: displayName(user) ?? `Guest ${viewerId.slice(0, 4).toUpperCase()}`,
        // the studio shows the viewer's browser / OS
        metadata: JSON.stringify({ role: "viewer", ua: userAgent?.slice(0, 160) ?? "" }),
        ttl: VIEWER_TOKEN_TTL,
    });
    token.addGrant({
        room: liveRoomName(auctionUuid),
        roomJoin: true,
        canSubscribe: true,
        canPublish: false,
        canPublishData: false,
    });

    return { url, token: await token.toJwt() };
};

// =====================================================================
// HOST TOKEN — the studio publishes camera / mic / screen into the room
// =====================================================================

export const createHostTokenService = async ({ auctionUuid, userId }) => {
    const { url, apiKey, apiSecret } = livekitConfig();

    const auction = await findStreamAuction(auctionUuid);
    if (!STREAM_STATUSES.includes(auction.status)) throw httpError("You can only go live while the auction is live", 409);

    const user = await findUser(userId);
    if (!user) throw httpError("User not found", 404);

    const token = new AccessToken(apiKey, apiSecret, {
        identity: `${HOST_PREFIX}${user.uuid}`,
        name: displayName(user) ?? "Auctioneer",
        metadata: JSON.stringify({ role: "host" }),
        ttl: HOST_TOKEN_TTL,
    });
    token.addGrant({
        room: liveRoomName(auctionUuid),
        roomJoin: true,
        canSubscribe: true,
        canPublish: true,
        canPublishData: true,
        roomAdmin: true,
    });

    return { url, token: await token.toJwt(), auction: { uuid: auctionUuid, title: auction.title, status: auction.status } };
};

// =====================================================================
// ON AIR — auctions whose room has someone publishing (the navbar's live dot)
// =====================================================================

export const getOnAirService = async () => {
    if (!isLivekitConfigured()) return { configured: false, auctions: [] };

    const rooms = await roomService().listRooms();
    const live = rooms
        .filter((room) => room.numPublishers > 0)
        .map((room) => ({ uuid: auctionUuidFromRoom(room.name), viewers: Math.max(0, room.numParticipants - room.numPublishers) }))
        .filter((room) => room.uuid);

    const auctions = live.length
        ? await prisma.auction.findMany({
              where: { uuid: { in: live.map((room) => room.uuid) }, deletedAt: null },
              select: { uuid: true, title: true },
          })
        : [];

    return {
        configured: true,
        auctions: auctions.map((auction) => ({ ...auction, viewers: live.find((room) => room.uuid === auction.uuid)?.viewers ?? 0 })),
    };
};

// =====================================================================
// MODERATION — remove a viewer now, or ban them from rejoining the stream
// =====================================================================

const assertViewerIdentity = (identity) => {
    if (identity.startsWith(HOST_PREFIX)) throw httpError("You can't remove the host", 400);
};

// a viewer who already left isn't an error — the ban still applies
const removeFromRoom = async (auctionUuid, identity) => {
    try {
        await roomService().removeParticipant(liveRoomName(auctionUuid), identity);
    } catch (error) {
        const notInRoom = error?.status === 404 || /not.?found/i.test(error?.message ?? "");
        if (!notInRoom) throw error;
    }
};

export const removeViewerService = async ({ auctionUuid, identity, ban, name, userId }) => {
    assertViewerIdentity(identity);
    const auction = await findStreamAuction(auctionUuid);

    if (ban) {
        await prisma.liveStreamBan.upsert({
            where: { auctionId_identity: { auctionId: auction.id, identity } },
            create: { auctionId: auction.id, identity, name: name ?? null, bannedBy: userId ? BigInt(userId) : null },
            update: { name: name ?? undefined },
        });
    }
    await removeFromRoom(auctionUuid, identity);

    return { message: ban ? `${name ?? "Viewer"} has been banned` : `${name ?? "Viewer"} has been removed` };
};

export const getBansService = async ({ auctionUuid }) => {
    const auction = await findStreamAuction(auctionUuid);
    const bans = await prisma.liveStreamBan.findMany({
        where: { auctionId: auction.id },
        orderBy: { createdAt: "desc" },
        select: { identity: true, name: true, createdAt: true, issuer: { select: USER_NAME_SELECT } },
    });
    return serializeBigInt(bans.map(({ issuer, ...ban }) => ({ ...ban, bannedBy: displayName(issuer) })));
};

export const unbanViewerService = async ({ auctionUuid, identity }) => {
    const auction = await findStreamAuction(auctionUuid);
    await prisma.liveStreamBan.deleteMany({ where: { auctionId: auction.id, identity } });
    return { message: "Viewer can watch again" };
};
