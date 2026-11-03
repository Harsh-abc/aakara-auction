import redis from "./redis.js";

// =====================================================================
// How many people are watching a sale's live room — people, not tabs.
// A signed-in viewer is their account (every tab and device counts once);
// a guest is their browser (a random id the storefront keeps in localStorage,
// shared by all its tabs). A connection without either counts on its own.
//
//   viewers:{auctionUuid}     ZSET    "{viewer}#{socketId}" → when that tab was last seen (ms)
//   viewers:{auctionUuid}:n   STRING  "{count}|{version}" — the count last announced
//
// Tabs are added on join and removed on leave / disconnect. Every API instance
// re-stamps its own tabs on a heartbeat, so the tabs of an instance that died
// age out instead of counting forever. Counts are announced to the auction room
// only when they change; each carries a version (Redis time) so a client never
// swaps a newer count for an older one that arrived late.
// =====================================================================

const HEARTBEAT_MS = 15_000;
// a tab not re-stamped for three heartbeats belonged to an instance that's gone
const STALE_MS = 3 * HEARTBEAT_MS;
const KEY_TTL_SECONDS = 120;
// joins and leaves arriving together (a sale opening) are counted once
const RECOUNT_DELAY_MS = 1_000;

export const VIEWERS_EVENT = "auction:viewers";

const keys = {
    tabs: (auctionUuid) => `viewers:${auctionUuid}`,
    announced: (auctionUuid) => `viewers:${auctionUuid}:n`,
};

// KEYS: 1 tabs zset, 2 announced
// ARGV: 1 drop tabs last seen before (ms), 2 key ttl (s)
// → { count, version, changed (1/0) }
const COUNT_LUA = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', '(' .. ARGV[1])
local seen, count = {}, 0
for _, tab in ipairs(redis.call('ZRANGE', KEYS[1], 0, -1)) do
    local viewer = string.match(tab, '^(.*)#') or tab
    if not seen[viewer] then
        seen[viewer] = true
        count = count + 1
    end
end

local last = redis.call('GET', KEYS[2])
local lastCount, lastVersion = nil, 0
if last then
    local c, v = string.match(last, '^(%d+)|(%d+)$')
    lastCount, lastVersion = tonumber(c), tonumber(v) or 0
end

if lastCount == count then
    redis.call('EXPIRE', KEYS[2], ARGV[2])
    return { count, lastVersion, 0 }
end

local now = redis.call('TIME')
local version = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
if version <= lastVersion then version = lastVersion + 1 end
redis.call('SET', KEYS[2], count .. '|' .. version, 'EX', ARGV[2])
return { count, version, 1 }
`;

redis.defineCommand("viewerCount", { numberOfKeys: 2, lua: COUNT_LUA });

const GUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The handshake's guest id, if it's a well-formed one. */
export const readVisitorId = (value) => (typeof value === "string" && GUEST_ID_RE.test(value) ? value.toLowerCase() : null);

// who a connection belongs to: the account, else the browser, else just this connection
const viewerOf = (socket) => {
    const user = socket.data.user;
    if (user) return `u:${user.userId}`;
    if (socket.data.visitor) return `g:${socket.data.visitor}`;
    return `s:${socket.id}`;
};

const tabOf = (socket) => `${viewerOf(socket)}#${socket.id}`;

const watchedBy = (socket) => {
    if (!socket.data.watching) socket.data.watching = new Set();
    return socket.data.watching;
};

/**
 * Starts counting viewers on this instance. `roomOf(auctionUuid)` is the room the counts go to.
 * Returns the hooks the socket handlers call.
 */
export const startViewerTracking = (io, roomOf) => {
    // auctionUuid → { timer, joiners } — a recount waiting to run, and who joined since the last one
    const pending = new Map();

    const recount = async (auctionUuid) => {
        const entry = pending.get(auctionUuid);
        pending.delete(auctionUuid);

        const [count, version, changed] = await redis.viewerCount(
            keys.tabs(auctionUuid),
            keys.announced(auctionUuid),
            Date.now() - STALE_MS,
            KEY_TTL_SECONDS
        );
        const payload = { auctionUuid, count: Number(count), version: Number(version) };

        if (changed) {
            io.to(roomOf(auctionUuid)).emit(VIEWERS_EVENT, payload);
        } else {
            // nothing new for the room, but a tab that just joined hasn't heard the count yet
            for (const socket of entry?.joiners ?? []) if (socket.connected) socket.emit(VIEWERS_EVENT, payload);
        }
    };

    const scheduleRecount = (auctionUuid, joiner) => {
        let entry = pending.get(auctionUuid);
        if (!entry) {
            entry = {
                joiners: new Set(),
                timer: setTimeout(() => {
                    recount(auctionUuid).catch((error) => console.error("[viewers] recount failed:", error));
                }, RECOUNT_DELAY_MS),
            };
            pending.set(auctionUuid, entry);
        }
        if (joiner) entry.joiners.add(joiner);
    };

    const stamp = (pipeline, auctionUuid, socket, now) => {
        pipeline.zadd(keys.tabs(auctionUuid), now, tabOf(socket));
        pipeline.expire(keys.tabs(auctionUuid), KEY_TTL_SECONDS);
    };

    // re-stamp every tab this instance holds, then recount the sales they're watching
    const heartbeat = setInterval(() => {
        const now = Date.now();
        const pipeline = redis.pipeline();
        const auctions = new Set();
        for (const socket of io.of("/").sockets.values()) {
            for (const auctionUuid of socket.data.watching ?? []) {
                stamp(pipeline, auctionUuid, socket, now);
                auctions.add(auctionUuid);
            }
        }
        if (auctions.size === 0) return;
        pipeline
            .exec()
            .then(() => auctions.forEach((auctionUuid) => scheduleRecount(auctionUuid)))
            .catch((error) => console.error("[viewers] heartbeat failed:", error));
    }, HEARTBEAT_MS);
    heartbeat.unref?.();

    const forget = async (socket, auctionUuid) => {
        watchedBy(socket).delete(auctionUuid);
        await redis.zrem(keys.tabs(auctionUuid), tabOf(socket));
        scheduleRecount(auctionUuid);
    };

    return {
        /** A tab opened the sale's live room. */
        join: async (socket, auctionUuid) => {
            watchedBy(socket).add(auctionUuid);
            const pipeline = redis.pipeline();
            stamp(pipeline, auctionUuid, socket, Date.now());
            await pipeline.exec();
            scheduleRecount(auctionUuid, socket);
        },

        /** A tab left the sale's live room. */
        leave: (socket, auctionUuid) => {
            if (!watchedBy(socket).has(auctionUuid)) return Promise.resolve();
            return forget(socket, auctionUuid);
        },

        /** A tab closed — it leaves every room it was watching. */
        disconnect: (socket) => Promise.all([...watchedBy(socket)].map((auctionUuid) => forget(socket, auctionUuid))),
    };
};
