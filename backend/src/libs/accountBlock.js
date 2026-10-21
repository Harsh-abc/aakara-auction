import redis from "./redis.js";
import { SESSION_TTL_SECONDS } from "./session.js";

// =====================================================================
// Access tokens that must stop working before they expire, checked on
// every authenticated request and socket connection:
//
//   suspended  auth:blocked:{userId}         every token of the account
//   revoked    auth:revoked-before:{userId}  tokens issued before that moment
//              (role changed, password changed) — the user logs in again
//              and gets a token with their new role
//
// Login and token refresh already go by the database (status, role, and
// the sessions deleted on these changes), but an access token stays valid
// until it expires. These keys only have to outlive the longest access
// token (SESSION_TTL_SECONDS in libs/session.js), since by then the user
// can't get a new one.
// =====================================================================

const KEY_TTL_SECONDS = SESSION_TTL_SECONDS + 60 * 60; // an hour past the longest access token

const blockKey = (userId) => `auth:blocked:${userId}`;
const revokedKey = (userId) => `auth:revoked-before:${userId}`;

export const blockUserAccess = (userId) => redis.set(blockKey(userId), "1", "EX", KEY_TTL_SECONDS);

export const unblockUserAccess = (userId) => redis.del(blockKey(userId));

/** Every access token the user holds now stops working (tokens issued from now on are fine). */
export const revokeUserTokens = (userId) => redis.set(revokedKey(userId), String(Date.now()), "EX", KEY_TTL_SECONDS);

// tokens carry the exact issue time in ms (iatMs); older ones only the second (iat)
const issuedAtMs = (decoded) => (typeof decoded.iatMs === "number" ? decoded.iatMs : (decoded.iat ?? 0) * 1000);

/**
 * Why a verified access token can't be used: "SUSPENDED", "REVOKED", or null when it's fine.
 * Fails open if Redis is down, so an outage doesn't log everyone out.
 */
export const tokenAccessProblem = async (decoded) => {
    const userId = decoded?.userId;
    if (userId === undefined || userId === null) return null;
    try {
        const [blocked, revokedBefore] = await redis.mget(blockKey(userId), revokedKey(userId));
        if (blocked) return "SUSPENDED";
        if (revokedBefore && issuedAtMs(decoded) < Number(revokedBefore)) return "REVOKED";
        return null;
    } catch (error) {
        console.error("[auth] could not check account access:", error);
        return null;
    }
};
