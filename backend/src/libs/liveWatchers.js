import redis from "./redis.js";

// =====================================================================
// WHO is on a sale's live room page — signed-in bidders and staff, by name,
// for the dashboard studio's Viewers list (libs/viewers.js only counts).
//
//   watchers:{auctionUuid}   ZSET   JSON {u: userId, s: socketId, t: joinedAt, a: userAgent} → last seen (ms)
//
// A tab is added when the live player mounts ("live:watch") and removed when it
// unmounts, navigates away or the socket drops. Every API instance re-stamps its
// own tabs on a heartbeat, so the tabs of an instance that died age out.
// Each change nudges the staff room ("live:watchers") and the studio refetches.
// =====================================================================

const HEARTBEAT_MS = 15_000;
// a tab not re-stamped for three heartbeats belonged to an instance that's gone
const STALE_MS = 3 * HEARTBEAT_MS;
const KEY_TTL_SECONDS = 120;
// joins and leaves arriving together are announced once
const NUDGE_DELAY_MS = 750;

export const WATCHERS_EVENT = "live:watchers";

const keyOf = (auctionUuid) => `watchers:${auctionUuid}`;

// auctionUuid → the member string this socket holds in the zset
const watchingOf = (socket) => {
    if (!socket.data.liveWatch) socket.data.liveWatch = new Map();
    return socket.data.liveWatch;
};

/**
 * Starts tracking live-room watchers on this instance. `notifyRoomOf(auctionUuid)` is the
 * room told when the list changes (the staff room). Returns the hooks the socket handlers call.
 */
export const startWatcherTracking = (io, notifyRoomOf) => {
    const pending = new Map();

    const nudge = (auctionUuid) => {
        if (pending.has(auctionUuid)) return;
        pending.set(
            auctionUuid,
            setTimeout(() => {
                pending.delete(auctionUuid);
                io.to(notifyRoomOf(auctionUuid)).emit(WATCHERS_EVENT, { auctionUuid });
            }, NUDGE_DELAY_MS)
        );
    };

    const heartbeat = setInterval(() => {
        const now = Date.now();
        const pipeline = redis.pipeline();
        let any = false;
        for (const socket of io.of("/").sockets.values()) {
            for (const [auctionUuid, member] of socket.data.liveWatch ?? []) {
                pipeline.zadd(keyOf(auctionUuid), now, member);
                pipeline.expire(keyOf(auctionUuid), KEY_TTL_SECONDS);
                any = true;
            }
        }
        if (any) pipeline.exec().catch((error) => console.error("[watchers] heartbeat failed:", error));
    }, HEARTBEAT_MS);
    heartbeat.unref?.();

    const forget = async (socket, auctionUuid) => {
        const member = watchingOf(socket).get(auctionUuid);
        if (!member) return;
        watchingOf(socket).delete(auctionUuid);
        await redis.zrem(keyOf(auctionUuid), member);
        nudge(auctionUuid);
    };

    return {
        /** A signed-in, eligible tab opened the sale's live room. */
        join: async (socket, auctionUuid) => {
            if (watchingOf(socket).has(auctionUuid)) return;
            const now = Date.now();
            const member = JSON.stringify({
                u: String(socket.data.user.userId),
                s: socket.id,
                t: now,
                a: String(socket.handshake.headers["user-agent"] ?? "").slice(0, 160),
            });
            watchingOf(socket).set(auctionUuid, member);
            await redis.pipeline().zadd(keyOf(auctionUuid), now, member).expire(keyOf(auctionUuid), KEY_TTL_SECONDS).exec();
            nudge(auctionUuid);
        },

        /** The tab left the live room (unmounted, navigated away, removed). */
        leave: (socket, auctionUuid) => forget(socket, auctionUuid),

        /** The tab closed — it leaves every live room it was in. */
        disconnect: (socket) => Promise.all([...watchingOf(socket).keys()].map((auctionUuid) => forget(socket, auctionUuid))),
    };
};

/** Every live tab of a sale: [{ userId, socketId, joinedAt, userAgent, lastSeen }]. Stale tabs are dropped. */
export const listWatcherTabs = async (auctionUuid) => {
    const key = keyOf(auctionUuid);
    const [, [, raw]] = await redis
        .pipeline()
        .zremrangebyscore(key, "-inf", `(${Date.now() - STALE_MS}`)
        .zrange(key, 0, -1, "WITHSCORES")
        .exec();

    const tabs = [];
    for (let i = 0; i < (raw?.length ?? 0); i += 2) {
        try {
            const { u, s, t, a } = JSON.parse(raw[i]);
            if (u) tabs.push({ userId: u, socketId: s, joinedAt: Number(t), userAgent: a ?? "", lastSeen: Number(raw[i + 1]) });
        } catch {
            // not ours — ignore
        }
    }
    return tabs;
};
