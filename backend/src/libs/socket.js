import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";

import prisma from "./prisma.js";
import redis from "./redis.js";

// =====================================================================
// Real-time channel (Socket.IO over the Redis adapter, so an event sent
// from any API instance reaches clients connected to any other).
//
// Rooms:
//   auction:{uuid}  storefront lot pages — public lot updates (bidders by paddle only)
//   staff:{uuid}    dashboard bidding floor — every bid with the bidder's name
//   user:{userId}   joined automatically when the socket carries a valid token
// =====================================================================

export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER", "STAFF"];

export const rooms = {
    auction: (auctionUuid) => `auction:${auctionUuid}`,
    staff: (auctionUuid) => `staff:${auctionUuid}`,
    user: (userId) => `user:${userId}`,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let io = null;

// invite-only sales are only watchable by staff and their registered bidders
const canWatchAuction = async (auctionUuid, user) => {
    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: { id: true, visibility: true, status: true, deletedAt: true },
    });
    if (!auction || auction.deletedAt || auction.status === "DRAFT") return false;
    if (auction.visibility !== "PRIVATE_INVITE_ONLY" || STAFF_ROLES.includes(user?.role)) return true;
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
    });

    // A token is optional — guests can watch public sales. A bad or expired token is treated as a guest.
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
                socket.data.user = { userId: decoded.userId, role: decoded.role };
            } catch {
                socket.data.user = null;
            }
        }
        next();
    });

    io.on("connection", (socket) => {
        const user = socket.data.user ?? null;
        if (user) socket.join(rooms.user(user.userId));

        socket.on("auction:join", async ({ auctionUuid } = {}, ack) => {
            try {
                if (!UUID_RE.test(auctionUuid ?? "")) return reply(ack, { ok: false, message: "Invalid auction id" });
                if (!(await canWatchAuction(auctionUuid, user))) return reply(ack, { ok: false, message: "Auction not found" });
                socket.join(rooms.auction(auctionUuid));
                reply(ack, { ok: true });
            } catch (error) {
                console.error("[socket] auction:join failed:", error);
                reply(ack, { ok: false, message: "Could not join the auction" });
            }
        });

        socket.on("auction:leave", ({ auctionUuid } = {}) => {
            if (UUID_RE.test(auctionUuid ?? "")) socket.leave(rooms.auction(auctionUuid));
        });

        socket.on("staff:join", ({ auctionUuid } = {}, ack) => {
            if (!STAFF_ROLES.includes(user?.role)) return reply(ack, { ok: false, message: "Not allowed" });
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
