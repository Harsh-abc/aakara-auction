import { AccessToken } from "livekit-server-sdk";

import prisma from "../libs/prisma.js";
import { listWatcherTabs } from "../libs/liveWatchers.js";
import { isDashboardRole } from "../libs/dashboardMfa.js";
import { serializeBigInt } from "../utils/serialize.js";
import {
    HOST_PREFIX,
    auctionUuidFromRoom,
    isLivekitConfigured,
    liveRoomName,
    livekitConfig,
    roomService,
    webhookReceiver,
} from "../libs/livekit.js";

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const httpErrorWithCode = (message, statusCode, code) => Object.assign(httpError(message, statusCode), { code });

// the stream is only open while the sale runs
const STREAM_STATUSES = ["LIVE", "PAUSED"];

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
// WHO MAY WATCH — the live room and its video are for bidders only:
// a signed-in, active BIDDER account with verified KYC, verified to bid on
// at least one lot of this auction (the same rule as bidding.services.js).
// Staff (dashboard roles) can watch too. Guests can't — every viewer is a
// LiveKit participant-minute, so the stream isn't open to the public.
// =====================================================================

const BLOCKED_PARTICIPANT_STATUSES = ["REJECTED", "BANNED"];

/** null when the user may watch, else { code, message } saying why not */
const watchDenial = async (auction, userId, role) => {
    if (!userId) return { code: "SIGN_IN", message: "Sign in with your bidder account to join the live auction." };
    if (isDashboardRole(role)) return null;

    const id = BigInt(userId);
    const [account, participant, verifiedLot] = await Promise.all([
        prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: { status: true, role: { select: { name: true } }, kyc: { select: { status: true } } },
        }),
        prisma.auctionParticipant.findUnique({
            where: { auctionId_userId: { auctionId: auction.id, userId: id } },
            select: { status: true },
        }),
        prisma.lotBidder.findFirst({
            where: { userId: id, status: "VERIFIED", item: { auctionId: auction.id } },
            select: { id: true },
        }),
    ]);

    if (!account) return { code: "SIGN_IN", message: "Sign in with your bidder account to join the live auction." };
    if (account.status !== "ACTIVE") {
        return { code: "NOT_BIDDER", message: "Your account is awaiting activation by the auction house. You can join the live auction once it's active." };
    }
    if (account.role?.name !== "BIDDER") {
        return { code: "NOT_BIDDER", message: "The live auction is open to registered bidders only. The auction house will make you a bidder once approved." };
    }
    if (account.kyc?.status !== "VERIFIED") {
        return { code: "NOT_BIDDER", message: "Your KYC must be verified before you can join the live auction. Check your profile for documents to resubmit." };
    }
    if (participant && BLOCKED_PARTICIPANT_STATUSES.includes(participant.status)) {
        return { code: "NOT_BIDDER", message: "Your registration for this auction isn't active, so you can't join its live room." };
    }
    if (!verifiedLot) {
        return participant
            ? { code: "PENDING", message: "Your registration for this auction is awaiting verification by the auction house." }
            : { code: "REGISTER", message: "Register for this auction to join its live room." };
    }
    return null;
};

// =====================================================================
// ACCESS — may this user open the live room page? (the page gate)
// =====================================================================

export const getWatchAccessService = async ({ auctionUuid, userId, role }) => {
    const auction = await findStreamAuction(auctionUuid);
    const denial = await watchDenial(auction, userId, role);
    return denial ? { allowed: false, ...denial } : { allowed: true, code: "OK", message: null };
};

/** May this signed-in socket be listed as watching the live room? (eligible, and not banned from the stream) */
export const canWatchLiveRoom = async ({ auctionUuid, userId, role }) => {
    if (!userId) return false;
    const auction = await prisma.auction.findFirst({ where: { uuid: auctionUuid, deletedAt: null }, select: { id: true } });
    if (!auction || (await watchDenial(auction, userId, role))) return false;

    const user = await prisma.user.findFirst({ where: { id: BigInt(userId), deletedAt: null }, select: { uuid: true } });
    if (!user) return false;
    const banned = await prisma.liveStreamBan.findUnique({
        where: { auctionId_identity: { auctionId: auction.id, identity: `user-${user.uuid}` } },
        select: { id: true },
    });
    return !banned;
};

// is the stream on? The studio only joins the room on "Go live" and leaves on "End live", so the
// auctioneer being in the room is the stream — even with their camera / mic switched off.
// Before that viewers aren't let in: every connected viewer is billed by the minute.
const hostOnAir = async (auctionUuid) => {
    try {
        const participants = await roomService().listParticipants(liveRoomName(auctionUuid));
        return participants.some((p) => p.identity.startsWith(HOST_PREFIX));
    } catch (error) {
        // the room doesn't exist until the host joins
        if (error?.status === 404 || /not.?found|does not exist/i.test(error?.message ?? "")) return false;
        throw error;
    }
};

// =====================================================================
// VIEWER TOKEN — watch-only access to the auction's live room
// Bidders join as "user-<uuid>" under their name. One identity per account,
// so a second tab or device replaces the first rather than doubling minutes.
// =====================================================================

export const createViewerTokenService = async ({ auctionUuid, userId, role, userAgent }) => {
    const { url, apiKey, apiSecret } = livekitConfig();

    const auction = await findStreamAuction(auctionUuid);
    const denial = await watchDenial(auction, userId, role);
    if (denial) throw httpErrorWithCode(denial.message, denial.code === "SIGN_IN" ? 401 : 403, denial.code);

    if (!STREAM_STATUSES.includes(auction.status)) throw httpErrorWithCode("The live stream is not on right now", 409, "OFF_AIR");

    const user = await findUser(userId);
    if (!user) throw httpErrorWithCode("Sign in with your bidder account to join the live auction.", 401, "SIGN_IN");
    const identity = `user-${user.uuid}`;

    const banned = await prisma.liveStreamBan.findUnique({
        where: { auctionId_identity: { auctionId: auction.id, identity } },
        select: { id: true },
    });
    if (banned) throw httpErrorWithCode("You have been removed from this live stream", 403, "REMOVED");

    // checked last: it's a LiveKit API call, and the player polls this while waiting
    if (!(await hostOnAir(auctionUuid))) throw httpErrorWithCode("The auctioneer hasn't gone live yet", 409, "OFF_AIR");

    const token = new AccessToken(apiKey, apiSecret, {
        identity,
        name: displayName(user) ?? "Bidder",
        // the studio shows who's watching (bidder / staff) and their browser / OS
        metadata: JSON.stringify({ role: "viewer", kind: isDashboardRole(role) ? "staff" : "bidder", ua: userAgent?.slice(0, 160) ?? "" }),
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
// WEBHOOK — LiveKit tells us when the auctioneer joins / leaves the room,
// so waiting players are pushed "on air" over the socket instead of polling.
// =====================================================================

/** Verifies a LiveKit webhook; returns { auctionUuid, onAir } when it changes whether a stream is on, else null */
export const handleLivekitWebhookService = async ({ body, authHeader }) => {
    if (typeof body !== "string" || !body) throw httpError("Invalid webhook body", 400);

    let event;
    try {
        event = await webhookReceiver().receive(body, authHeader);
    } catch (error) {
        if (error?.statusCode) throw error; // not configured (503)
        throw httpError("Invalid webhook signature", 401);
    }

    const auctionUuid = auctionUuidFromRoom(event.room?.name);
    if (!auctionUuid) return null;

    const isHost = event.participant?.identity?.startsWith(HOST_PREFIX);
    if (event.event === "participant_joined" && isHost) return { auctionUuid, onAir: true };
    if (event.event === "participant_left" && isHost) {
        // another staff member may still be hosting
        return { auctionUuid, onAir: await hostOnAir(auctionUuid).catch(() => false) };
    }
    if (event.event === "room_finished") return { auctionUuid, onAir: false };
    return null;
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

    // the account behind "user-<uuid>", so the controller can close their live room page too
    const userUuid = identity.startsWith("user-") ? identity.slice("user-".length) : null;
    const viewer = userUuid ? await prisma.user.findFirst({ where: { uuid: userUuid }, select: { id: true } }).catch(() => null) : null;

    return {
        message: ban ? `${name ?? "Viewer"} has been banned` : `${name ?? "Viewer"} has been removed`,
        viewerUserId: viewer ? viewer.id.toString() : null,
    };
};

// =====================================================================
// WATCHERS — who has the live room page open right now (libs/liveWatchers.js),
// by account: one row per person however many tabs. Banned people are left out.
// =====================================================================

export const getWatchersService = async ({ auctionUuid }) => {
    const auction = await findStreamAuction(auctionUuid);
    const tabs = await listWatcherTabs(auctionUuid);

    // userId → { joinedAt: first tab, userAgent: newest tab, tabs }
    const byUser = new Map();
    for (const tab of tabs) {
        const entry = byUser.get(tab.userId);
        if (!entry) {
            byUser.set(tab.userId, { joinedAt: tab.joinedAt, userAgent: tab.userAgent, newest: tab.joinedAt, tabs: 1 });
            continue;
        }
        entry.tabs += 1;
        entry.joinedAt = Math.min(entry.joinedAt, tab.joinedAt);
        if (tab.joinedAt > entry.newest) Object.assign(entry, { newest: tab.joinedAt, userAgent: tab.userAgent });
    }
    if (byUser.size === 0) return [];

    const ids = [...byUser.keys()].map((id) => BigInt(id));
    const [users, participants] = await Promise.all([
        prisma.user.findMany({
            where: { id: { in: ids }, deletedAt: null },
            select: { id: true, ...USER_NAME_SELECT, email: true, role: { select: { name: true } } },
        }),
        prisma.auctionParticipant.findMany({
            where: { auctionId: auction.id, userId: { in: ids } },
            select: { userId: true, paddleNumber: true },
        }),
    ]);
    const bans = await prisma.liveStreamBan.findMany({
        where: { auctionId: auction.id, identity: { in: users.map((user) => `user-${user.uuid}`) } },
        select: { identity: true },
    });
    const banned = new Set(bans.map((ban) => ban.identity));
    const paddles = new Map(participants.map((p) => [p.userId.toString(), p.paddleNumber]));

    return users
        .filter((user) => !banned.has(`user-${user.uuid}`))
        .map((user) => {
            const entry = byUser.get(user.id.toString());
            return {
                uuid: user.uuid,
                identity: `user-${user.uuid}`,
                name: displayName(user) ?? "Bidder",
                email: user.email,
                kind: isDashboardRole(user.role?.name) ? "staff" : "bidder",
                paddleNumber: paddles.get(user.id.toString()) ?? null,
                userAgent: entry.userAgent,
                joinedAt: new Date(entry.joinedAt).toISOString(),
                tabs: entry.tabs,
            };
        })
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
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
