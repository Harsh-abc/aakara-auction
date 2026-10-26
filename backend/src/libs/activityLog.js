import jwt from "jsonwebtoken";

import prisma from "./prisma.js";

/**
 * Activity log — the audit trail super admins read under Settings → Activity Logs.
 *
 *   logActivity()        writes one row; never throws (a failed log must not fail the request)
 *   setActivityActor()   lets a controller name the user when there is no req.user (logout)
 *   redact()             copy of a request body that is safe to store
 *
 * Requests are logged by middleware/activityLogger.js; the scheduler logs as the system.
 */

export const SYSTEM_ACTOR = { id: null, name: "System", email: null, role: "SYSTEM" };

// what the system does on its own (jobs/auctionScheduler.js)
export const SYSTEM_ACTIONS = [
    { module: "SYSTEM", action: "AUCTION_AUTO_START", label: "Auction started automatically" },
    { module: "SYSTEM", action: "AUCTION_AUTO_END", label: "Auction ended automatically" },
    { module: "SYSTEM", action: "AUCTION_AUTO_START_FAILED", label: "Auction failed to start automatically" },
    { module: "SYSTEM", action: "AUCTION_AUTO_END_FAILED", label: "Auction failed to end automatically" },
];

// never stored — swapped for "[REDACTED]"
const SECRET_KEY = /password|^otp$|^code$|token|secret|hash|authorization|cookie/i;
// stored with only the last 4 characters (KYC document numbers)
const MASKED_KEY = /documentNumber/i;

const MAX_STRING = 300;
const MAX_ARRAY = 25;
const MAX_DEPTH = 4;
const MAX_METADATA_CHARS = 8000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cut = (value, max) => {
    if (value === null || value === undefined) return null;
    const text = String(value);
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
};

const mask = (value) => (value.length <= 4 ? "••••" : "••••" + value.slice(-4));

export const redact = (value, depth = 0) => {
    if (value === null || value === undefined) return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "string") {
        return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}… (${value.length} chars)` : value;
    }
    if (typeof value !== "object") return value;
    if (value instanceof Date) return value.toISOString();
    if (depth >= MAX_DEPTH) return "[…]";

    if (Array.isArray(value)) {
        const items = value.slice(0, MAX_ARRAY).map((item) => redact(item, depth + 1));
        if (value.length > MAX_ARRAY) items.push(`… ${value.length - MAX_ARRAY} more`);
        return items;
    }

    const out = {};
    for (const [key, item] of Object.entries(value)) {
        if (SECRET_KEY.test(key)) out[key] = "[REDACTED]";
        else if (MASKED_KEY.test(key) && typeof item === "string") out[key] = mask(item);
        else out[key] = redact(item, depth + 1);
    }
    return out;
};

// metadata is for reading, not for replaying — anything huge keeps only its shape
const boundMetadata = (metadata) => {
    if (!metadata || Object.keys(metadata).length === 0) return undefined;
    const safe = redact(metadata);
    const json = JSON.stringify(safe);
    if (json.length <= MAX_METADATA_CHARS) return safe;
    return {
        truncated: true,
        keys: Object.keys(safe),
        preview: json.slice(0, MAX_METADATA_CHARS / 2),
    };
};

// ---------------------------------------------------------------------
// small TTL caches — a busy bidder shouldn't cost a user lookup per bid
// ---------------------------------------------------------------------

const createCache = (ttlMs, maxEntries = 2000) => {
    const entries = new Map();
    return async (key, load) => {
        const hit = entries.get(key);
        if (hit && Date.now() - hit.at < ttlMs) return hit.value;
        const value = await load();
        if (entries.size >= maxEntries) entries.clear();
        entries.set(key, { value, at: Date.now() });
        return value;
    };
};

const actorCache = createCache(5 * 60_000);
const targetCache = createCache(10 * 60_000);

const actorSelect = {
    id: true,
    email: true,
    username: true,
    role: { select: { name: true } },
    profile: { select: { firstName: true, lastName: true, displayName: true } },
};

const displayName = (user) =>
    user.profile?.displayName ||
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ||
    user.username;

const toActor = (user) =>
    user ? { id: user.id, name: displayName(user), email: user.email, role: user.role?.name ?? null } : null;

/** by { id } | { uuid } | { email } — null when there is no such user */
export const getActor = async (by) => {
    const [field, raw] = Object.entries(by).find(([, value]) => value !== null && value !== undefined) ?? [];
    if (!field) return null;
    if (field === "uuid" && !UUID_RE.test(String(raw))) return null;

    let value = raw;
    if (field === "id") {
        try {
            value = BigInt(raw);
        } catch {
            return null;
        }
    }
    if (field === "email") value = String(raw).trim().toLowerCase();

    try {
        return await actorCache(`${field}:${value}`, async () =>
            toActor(await prisma.user.findFirst({ where: { [field]: value }, select: actorSelect }))
        );
    } catch (err) {
        console.error("[activity] actor lookup failed:", err.message);
        return null;
    }
};

// ---------------------------------------------------------------------
// what the action was done to — a readable name next to the raw id
// ---------------------------------------------------------------------

const TARGET_LOADERS = {
    AUCTION: async (uuid) => {
        const auction = await prisma.auction.findUnique({ where: { uuid }, select: { title: true } });
        return auction?.title ?? null;
    },
    LOT: async (uuid) => {
        const lot = await prisma.auctionItem.findUnique({
            where: { uuid },
            select: { itemNumber: true, title: true, auction: { select: { title: true } } },
        });
        return lot ? `Lot ${lot.itemNumber} · ${lot.title} — ${lot.auction.title}` : null;
    },
    USER: async (uuid) => {
        const user = await prisma.user.findUnique({ where: { uuid }, select: actorSelect });
        return user ? `${displayName(user)} (${user.email})` : null;
    },
};

export const getTargetLabel = async (type, id) => {
    const load = TARGET_LOADERS[type];
    if (!load || !id || !UUID_RE.test(String(id))) return null;
    try {
        return await targetCache(`${type}:${id}`, () => load(String(id)));
    } catch (err) {
        console.error("[activity] target lookup failed:", err.message);
        return null;
    }
};

// ---------------------------------------------------------------------
// who sent a request
// ---------------------------------------------------------------------

/** for routes without `authenticate` (storefront, auth) — the token's user, if any */
export const identifyFromToken = (req) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return null;
    try {
        const decoded = jwt.verify(header.substring(7).trim(), process.env.JWT_ACCESS_SECRET);
        return decoded.userId ? { userId: decoded.userId } : null;
    } catch {
        return null;
    }
};

/** a controller that knows the user when req.user isn't set (e.g. logout) */
export const setActivityActor = (req, userId) => {
    if (userId !== null && userId !== undefined) req.activityActorId = userId;
};

// ---------------------------------------------------------------------
// repeats — page views are refetched every few seconds; keep one per window
// ---------------------------------------------------------------------

const lastSeen = new Map();

export const isRepeat = (key, windowMs) => {
    const now = Date.now();
    const seen = lastSeen.get(key);
    if (seen && now - seen < windowMs) return true;
    if (lastSeen.size >= 10_000) {
        for (const [k, at] of lastSeen) if (now - at >= windowMs) lastSeen.delete(k);
        if (lastSeen.size >= 10_000) lastSeen.clear();
    }
    lastSeen.set(key, now);
    return false;
};

// ---------------------------------------------------------------------
// write
// ---------------------------------------------------------------------

/**
 * @param {object} entry
 * @param {object} [entry.actor]   { id, name, email, role } — or pass userId and it is looked up
 * @param {string} entry.module    AUTH | AUCTION | LOT | BIDDING | USER | KYC | ...
 * @param {string} entry.action    e.g. LOGIN, BID_PLACE
 */
export const logActivity = async ({
    actor,
    userId,
    module,
    action,
    description,
    method,
    path,
    statusCode,
    success = true,
    ip,
    userAgent,
    targetType,
    targetId,
    targetLabel,
    metadata,
    durationMs,
}) => {
    try {
        const who = actor ?? (userId ? await getActor({ id: userId }) : null);
        await prisma.activityLog.create({
            data: {
                userId: who?.id ?? null,
                actorName: cut(who?.name, 160),
                actorEmail: cut(who?.email, 255),
                actorRole: cut(who?.role, 40),
                module: cut(module, 40) ?? "SYSTEM",
                action: cut(action, 80) ?? "UNKNOWN",
                description: cut(description, 2000),
                method: cut(method, 10),
                path: cut(path, 500),
                statusCode: statusCode ?? null,
                success,
                ipAddress: cut(ip, 64),
                userAgent: cut(userAgent, 500),
                targetType: cut(targetType, 40),
                targetId: cut(targetId, 100),
                targetLabel: cut(targetLabel, 300),
                metadata: boundMetadata(metadata),
                durationMs: Number.isFinite(durationMs) ? Math.round(durationMs) : null,
            },
        });
    } catch (err) {
        console.error("[activity] could not write log:", err.message);
    }
};
