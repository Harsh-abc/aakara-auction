import redis, { deleteKeys, scanKeys } from "./redis.js";

// =====================================================================
// Sign-in IP blocking, kept in Redis:
//
//   login:ip-fail:{ip}   failed sign-ins from the IP in the current window
//   login:ip-block:{ip}  set once that count reaches IP_BLOCK_THRESHOLD —
//                        every sign-in from the IP is refused until it expires
//
// The failure count outlives the block, so one more wrong password after the
// block ends blocks the IP again. Unblocking clears both keys, so the IP signs
// in as usual. Settings → Blocked IPs lists these keys and lets a super admin
// clear them.
// =====================================================================

// const IP_BLOCK_WINDOW = 15 * 60;   // 15 minutes
// const IP_BLOCK_THRESHOLD = 3;
// const IP_BLOCK_DURATION = 30 * 60; // 30 minutes

export const IP_BLOCK_THRESHOLD = 20;
export const IP_BLOCK_WINDOW = 15 * 60;
export const IP_BLOCK_DURATION = 5 * 60;

const FAIL_PREFIX = "login:ip-fail:";
const BLOCK_PREFIX = "login:ip-block:";

const ipFailKey = (ip) => `${FAIL_PREFIX}${ip}`;
const ipBlockKey = (ip) => `${BLOCK_PREFIX}${ip}`;

// ── used on every sign-in ────────────────────────────

export const isIpBlocked = async (ip) => {
    try {
        const blocked = await redis.get(ipBlockKey(ip));
        return Boolean(blocked);
    } catch (err) {
        // Fail open: never let a Redis outage lock out every login
        console.error('Redis error in isIpBlocked, failing open:', err);
        return false;
    }
};

export const registerIpFailure = async (ip) => {
    try {
        const count = await redis.incr(ipFailKey(ip));
        if (count === 1) await redis.expire(ipFailKey(ip), IP_BLOCK_WINDOW);

        if (count >= IP_BLOCK_THRESHOLD) {
            await redis.set(ipBlockKey(ip), '1', 'EX', IP_BLOCK_DURATION);
        }
    } catch (err) {
        console.error('Redis error in registerIpFailure, failing open:', err);
    }
};

/** Clears the IP's block and failure count (throws if Redis is down). */
export const unblockIp = (ip) => redis.del(ipFailKey(ip), ipBlockKey(ip));

// after a successful sign-in
export const clearIpFailures = async (ip) => {
    try {
        await unblockIp(ip);
    } catch (err) {
        console.error('Redis error in clearIpFailures:', err);
    }
};

// ── Settings → Blocked IPs ───────────────────────────

/**
 * Every IP that is blocked or has failed sign-ins in its window, with the time
 * left on each key in ms (null = no expiry).
 */
export const listIpBlocks = async () => {
    const [blockKeys, failKeys] = await Promise.all([scanKeys(`${BLOCK_PREFIX}*`), scanKeys(`${FAIL_PREFIX}*`)]);
    const ips = [
        ...new Set([
            ...blockKeys.map((key) => key.slice(BLOCK_PREFIX.length)),
            ...failKeys.map((key) => key.slice(FAIL_PREFIX.length)),
        ]),
    ];
    if (!ips.length) return [];

    const pipeline = redis.pipeline();
    for (const ip of ips) pipeline.pttl(ipBlockKey(ip)).get(ipFailKey(ip)).pttl(ipFailKey(ip));
    const results = (await pipeline.exec()).map(([err, value]) => (err ? null : value));

    // PTTL: -2 = key gone, -1 = no expiry
    const timeLeft = (pttl) => (pttl > 0 ? pttl : null);

    return ips
        .map((ip, i) => {
            const [blockTtl, fails, failTtl] = results.slice(i * 3, i * 3 + 3);
            const blocked = blockTtl !== null && blockTtl !== -2;
            return {
                ip,
                blocked,
                blockExpiresInMs: blocked ? timeLeft(blockTtl) : null,
                failedAttempts: Number(fails ?? 0),
                failuresExpireInMs: fails ? timeLeft(failTtl) : null,
            };
        })
        .filter((entry) => entry.blocked || entry.failedAttempts > 0);
};

/** Clears every IP's block and failure count; returns how many IPs were blocked. */
export const unblockAllIps = async () => {
    const [blockKeys, failKeys] = await Promise.all([scanKeys(`${BLOCK_PREFIX}*`), scanKeys(`${FAIL_PREFIX}*`)]);
    await deleteKeys([...blockKeys, ...failKeys]);
    return blockKeys.length;
};
