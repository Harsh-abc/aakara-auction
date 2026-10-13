import redis from "./redis.js";

// =====================================================================
// Suspended accounts, checked on every authenticated request.
//
// Login and token refresh already refuse a suspended account (status in the
// database), but an access token stays valid until it expires. A key here
// stops those tokens straight away. It only has to outlive the longest
// access token (ACCESS_TOKEN_TTL in services/auth.services.js), since by then
// the user can't get a new one.
// =====================================================================

const BLOCK_TTL_SECONDS = 6 * 60 * 60; // access tokens last 5 hours

const blockKey = (userId) => `auth:blocked:${userId}`;

export const blockUserAccess = (userId) => redis.set(blockKey(userId), "1", "EX", BLOCK_TTL_SECONDS);

export const unblockUserAccess = (userId) => redis.del(blockKey(userId));

/** True when the user was suspended after their token was issued. Fails open if Redis is down. */
export const isUserBlocked = async (userId) => {
    if (userId === undefined || userId === null) return false;
    try {
        return (await redis.exists(blockKey(userId))) === 1;
    } catch (error) {
        console.error("[auth] could not check account block:", error);
        return false;
    }
};
