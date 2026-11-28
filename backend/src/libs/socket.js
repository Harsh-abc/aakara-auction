import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";

import prisma from "./prisma.js";
import redis from "./redis.js";
import { bidKeys } from "./biddingStore.js";
import { tokenAccessProblem } from "./accountBlock.js";
import { DASHBOARD_ROLES, tokenHasFreshMfa } from "./dashboardMfa.js";
import { readVisitorId, startViewerTracking } from "./viewers.js";
import { startWatcherTracking } from "./liveWatchers.js";
import { canWatchLiveRoom } from "../services/liveStream.services.js";
import { canSeeAuction } from "./liveAccess.js";

// =====================================================================
// Real-time channel (Socket.IO over the Redis adapter, so an event sent
// from any API instance reaches clients connected to any other).
//
// Rooms:
//   auction:{uuid}  storefront lot pages — public lot updates (bidders by paddle only)
//   staff:{uuid}    dashboard bidding floor — every bid with the bidder's name
//   user:{userId}   joined automatically when the socket carries a valid token
//   live:{uuid}     eligible live room tabs ("live:watch") — told "live:on-air" when the auctioneer goes live / ends
//
// "lot:live" (a lot went on the block) goes to every tab for a public sale, and to the
// registered bidders' user rooms for an invite-only one (services/liveAuction.services.js).
//
// Storefront tabs in auction:{uuid} are counted as viewers (libs/viewers.js) — once
// per account or browser — and the count is sent to the room as "auction:viewers".
// Signed-in, eligible tabs on the live room page are also listed by name
// (libs/liveWatchers.js): "live:watch" / "live:unwatch", and staff:{uuid} hears "live:watchers".
// =====================================================================

export const STAFF_ROLES = DASHBOARD_ROLES;

// staff privileges need an authenticator code from the last 6 hours too (libs/dashboardMfa.js) —
// without one a staff login is a regular visitor
const isVerifiedStaff = (user) => STAFF_ROLES.includes(user?.role) && tokenHasFreshMfa(user);

export const rooms = {
    auction: (auctionUuid) => `auction:${auctionUuid}`,
    staff: (auctionUuid) => `staff:${auctionUuid}`,
    user: (userId) => `user:${userId}`,
    live: (auctionUuid) => `live:${auctionUuid}`,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let io = null;

// invite-only sales are only watchable by staff and their registered bidders;
// a restricted live sale (Settings → Live Access) only by staff and its picked bidders
const canWatchAuction = async (auctionUuid, user) => {
    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: { id: true, visibility: true, status: true, deletedAt: true, liveAccessRestricted: true },
    });
    if (!auction || auction.deletedAt || auction.status === "DRAFT") return false;
    if (isVerifiedStaff(user)) return true;
    if (!(await canSeeAuction(auction, user))) return false;
    if (auction.visibility !== "PRIVATE_INVITE_ONLY") return true;
    if (!user) return false;
    const registration = await prisma.auctionParticipant.findUnique({
        where: { auctionId_userId: { auctionId: auction.id, userId: BigInt(user.userId) } },
        select: { id: true },
    });
    return Boolean(registration);
};

const reply = (ack, payload) => {
    if (typeof ack === "function") ack(payload);
};

export const initSocket = (server) => {
    io = new Server(server, {
        cors: { origin: process.env.FRONTEND_URL, credentials: true },
        adapter: createAdapter(redis.duplicate(), redis.duplicate()),
        // notice a dead connection (a phone switching networks, a stalled Wi-Fi) in ~18 s instead of the
        // default ~45 s, so the tab reconnects and catches up sooner — everything sent meanwhile is missed
        pingInterval: 10_000,
        pingTimeout: 8_000,
    });

    const viewers = startViewerTracking(io, rooms.auction);
    const watchers = startWatcherTracking(io, rooms.staff);

    // A token is optional — guests can watch public sales. A bad or expired token, a
    // suspended account, or a token from before a role / password change is treated as a guest.
    // `visitor` is the browser's guest id, so a guest's tabs count as one viewer.
    io.use(async (socket, next) => {
        socket.data.visitor = readVisitorId(socket.handshake.auth?.visitor);
        const token = socket.handshake.auth?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
                socket.data.user = (await tokenAccessProblem(decoded))
                    ? null
                    : { userId: decoded.userId, role: decoded.role, mfa: decoded.mfa, mfaUntil: decoded.mfaUntil };
            } catch {
                socket.data.user = null;
            }
        }
        next();
    });

    io.on("connection", (socket) => {
        const user = socket.data.user ?? null;
        if (user) socket.join(rooms.user(user.userId));

        // the authenticator code runs out while connected → out of the dashboard rooms
        // (the dashboard asks for a new code and reconnects with the new token)
        if (isVerifiedStaff(user)) {
            const expiry = setTimeout(() => {
                for (const room of socket.rooms) if (room.startsWith("staff:")) socket.leave(room);
            }, user.mfaUntil - Date.now());
            socket.on("disconnect", () => clearTimeout(expiry));
        }

        // the live pages time this round trip to warn a user whose connection is too weak (NetworkBanner)
        // `now` lets the page line its clock up with ours, to measure how late "lot:update" reaches it
        socket.on("net:ping", (_payload, ack) => reply(ack, { ok: true, now: Date.now() }));

        // the auctioneer's latest callout, for a tab that (re)connects just after it was sent
        socket.on("callout:latest", async ({ auctionUuid } = {}, ack) => {
            try {
                if (!UUID_RE.test(auctionUuid ?? "")) return reply(ack, { ok: false });
                if (!(await canWatchAuction(auctionUuid, user))) return reply(ack, { ok: false });
                const saved = await redis.get(bidKeys.auctionCallout(auctionUuid));
                if (!saved) return reply(ack, { ok: true, callout: null });
                const callout = JSON.parse(saved);
                // its age by our clock — the page's clock may be off
                reply(ack, { ok: true, callout, ageMs: Math.max(0, Date.now() - Date.parse(callout.at)) });
            } catch (error) {
                console.error("[socket] callout:latest failed:", error);
                reply(ack, { ok: false });
            }
        });

        socket.on("auction:join", async ({ auctionUuid } = {}, ack) => {
            try {
                if (!UUID_RE.test(auctionUuid ?? "")) return reply(ack, { ok: false, message: "Invalid auction id" });
                if (!(await canWatchAuction(auctionUuid, user))) return reply(ack, { ok: false, message: "Auction not found" });
                // the tab may have closed while the check ran
                if (!socket.connected) return;
                socket.join(rooms.auction(auctionUuid));
                reply(ack, { ok: true });
                await viewers.join(socket, auctionUuid);
            } catch (error) {
                console.error("[socket] auction:join failed:", error);
                reply(ack, { ok: false, message: "Could not join the auction" });
            }
        });

        socket.on("auction:leave", ({ auctionUuid } = {}) => {
            if (!UUID_RE.test(auctionUuid ?? "")) return;
            socket.leave(rooms.auction(auctionUuid));
            viewers.leave(socket, auctionUuid).catch((error) => console.error("[socket] viewer leave failed:", error));
        });

        // the live room page (bidders and staff only) — the studio lists who's on it
        socket.on("live:watch", async ({ auctionUuid } = {}, ack) => {
            try {
                if (!user) return reply(ack, { ok: false, message: "Sign in to join the live room" });
                if (!UUID_RE.test(auctionUuid ?? "")) return reply(ack, { ok: false, message: "Invalid auction id" });
                if (!(await canWatchLiveRoom({ auctionUuid, userId: user.userId, role: user.role }))) {
                    return reply(ack, { ok: false, message: "Not allowed" });
                }
                // the tab may have closed while the check ran
                if (!socket.connected) return;
                socket.join(rooms.live(auctionUuid));
                await watchers.join(socket, auctionUuid);
                reply(ack, { ok: true });
            } catch (error) {
                console.error("[socket] live:watch failed:", error);
                reply(ack, { ok: false, message: "Could not join the live room" });
            }
        });

        socket.on("live:unwatch", ({ auctionUuid } = {}) => {
            if (!UUID_RE.test(auctionUuid ?? "")) return;
            socket.leave(rooms.live(auctionUuid));
            watchers.leave(socket, auctionUuid).catch((error) => console.error("[socket] live:unwatch failed:", error));
        });

        socket.on("disconnect", () => {
            viewers.disconnect(socket).catch((error) => console.error("[socket] viewer disconnect failed:", error));
            watchers.disconnect(socket).catch((error) => console.error("[socket] watcher disconnect failed:", error));
        });

        socket.on("staff:join", ({ auctionUuid } = {}, ack) => {
            if (!isVerifiedStaff(user)) return reply(ack, { ok: false, message: "Not allowed" });
            if (!UUID_RE.test(auctionUuid ?? "")) return reply(ack, { ok: false, message: "Invalid auction id" });
            socket.join([rooms.staff(auctionUuid), rooms.auction(auctionUuid)]);
            reply(ack, { ok: true });
        });

        socket.on("staff:leave", ({ auctionUuid } = {}) => {
            if (!UUID_RE.test(auctionUuid ?? "")) return;
            socket.leave(rooms.staff(auctionUuid));
            socket.leave(rooms.auction(auctionUuid));
        });
    });

    return io;
};

/** Sends an event to a room on every API instance. A no-op until the socket server starts. */
export const emitTo = (room, event, payload) => {
    io?.to(room).emit(event, payload);
};

/** Sends an event to every connected tab on every API instance (e.g. "lot:live" for a public sale). */
export const emitAll = (event, payload) => {
    io?.emit(event, payload);
};

/**
 * Settings → Live Access: takes every tab that may no longer see the sale out of its storefront
 * and live rooms, on every API instance, and tells it "auction:hidden" so the page reloads into
 * the "coming soon" view. Call after the sale goes live, its restriction is switched on, or a
 * bidder is taken off its list. Resolves to how many tabs were removed.
 */
export const ejectHiddenViewers = async (auctionUuid) => {
    if (!io) return 0;
    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: { id: true, status: true, liveAccessRestricted: true },
    });
    if (!auction) return 0;

    const sockets = await io.in([rooms.auction(auctionUuid), rooms.live(auctionUuid)]).fetchSockets();
    let removed = 0;
    for (const socket of sockets) {
        const user = socket.data.user ?? null;
        if (isVerifiedStaff(user) || (await canSeeAuction(auction, user))) continue;
        socket.leave(rooms.auction(auctionUuid));
        socket.leave(rooms.live(auctionUuid));
        socket.emit("auction:hidden", { auctionUuid });
        removed += 1;
    }
    return removed;
};

/** Drops a user's open connections on every API instance (suspended, role or password changed); they reconnect with whatever token they hold now. */
export const disconnectUser = (userId) => {
    io?.in(rooms.user(userId)).disconnectSockets(true);
};
