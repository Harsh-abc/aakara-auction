import crypto from "crypto";

import redis from "./redis.js";

// =====================================================================
// Google Authenticator for the dashboard.
//
// Dashboard roles sign in with their email and password like everyone else,
// but that login can't use the dashboard until it enters a code from their
// authenticator app (POST /api/auth/mfa/verify). That marks the session
// (user_sessions.mfaVerifiedAt), and every access token issued for it from
// then on — including refreshes — carries `mfa: true` and `mfaUntil`, the moment
// the code stops counting (MFA_VALID_MS after it was entered). requireRole and the
// staff socket rooms refuse dashboard roles whose token lacks it or is past it.
//
// A new login starts unverified, and a code lasts MFA_VALID_MS: after that the
// dashboard asks for a new one (the login itself stays signed in).
// =====================================================================

export const DASHBOARD_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"];

export const isDashboardRole = (role) => DASHBOARD_ROLES.includes(role);

// how long an authenticator code keeps the dashboard open
export const MFA_VALID_MS = 6 * 60 * 60 * 1000;

/** When a code entered at `verifiedAt` stops counting (epoch ms), or null when it already has / never was. */
export const mfaValidUntil = (verifiedAt, now = Date.now()) => {
    const until = verifiedAt ? verifiedAt.getTime() + MFA_VALID_MS : 0;
    return until > now ? until : null;
};

/** The token carries an authenticator code that still counts. Tokens without `mfaUntil` (older ones) don't. */
export const tokenHasFreshMfa = (decoded, now = Date.now()) =>
    decoded?.mfa === true && typeof decoded.mfaUntil === "number" && decoded.mfaUntil > now;

/** A dashboard role whose login hasn't entered its authenticator code. */
export const lacksDashboardMfa = (user) => isDashboardRole(user?.role) && user?.mfa !== true;

export const MFA_REQUIRED = "MFA_REQUIRED";

// the name the authenticator app shows above the code
export const MFA_ISSUER = process.env.MFA_ISSUER || "Aakara Auctions";

// ── the stored secret, encrypted (AES-256-GCM) ───────

let warnedAboutKey = false;

// MFA_ENCRYPTION_KEY can be any long random string. Changing it (or, without it,
// JWT_ACCESS_SECRET) means everyone sets up their authenticator again.
const encryptionKey = () => {
    const source = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET;
    if (!source) throw new Error("MFA_ENCRYPTION_KEY is not set");
    if (!process.env.MFA_ENCRYPTION_KEY && !warnedAboutKey) {
        warnedAboutKey = true;
        console.warn("[mfa] MFA_ENCRYPTION_KEY is not set — encrypting authenticator secrets with a key derived from JWT_ACCESS_SECRET");
    }
    return crypto.createHash("sha256").update(source).digest();
};

export const encryptSecret = (secret) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
};

export const decryptSecret = (stored) => {
    const [version, iv, tag, data] = String(stored).split(":");
    if (version !== "v1") throw new Error("Unknown authenticator secret format");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
};

// ── wrong codes ──────────────────────────────────────

const MAX_FAILURES = 5;
const FAILURE_WINDOW = 15 * 60;

const failKey = (userId) => `mfa:fail:${userId}`;

/** Seconds until the user may try again, or 0. Fails open if Redis is down (the code is still checked). */
export const mfaRetryAfter = async (userId) => {
    try {
        const [count, ttl] = await Promise.all([redis.get(failKey(userId)), redis.ttl(failKey(userId))]);
        return Number(count ?? 0) >= MAX_FAILURES ? Math.max(ttl, 1) : 0;
    } catch (err) {
        console.error("[mfa] could not read failed attempts:", err);
        return 0;
    }
};

/** Records a wrong code; returns how many tries are left in the window. */
export const registerMfaFailure = async (userId) => {
    try {
        const count = await redis.incr(failKey(userId));
        if (count === 1) await redis.expire(failKey(userId), FAILURE_WINDOW);
        return Math.max(MAX_FAILURES - count, 0);
    } catch (err) {
        console.error("[mfa] could not record a failed attempt:", err);
        return MAX_FAILURES;
    }
};

export const clearMfaFailures = (userId) => redis.del(failKey(userId)).catch(() => {});
