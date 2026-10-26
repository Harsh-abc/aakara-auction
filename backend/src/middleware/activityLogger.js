import {
    getActor,
    getTargetLabel,
    identifyFromToken,
    isRepeat,
    logActivity,
    redact,
    SYSTEM_ACTIONS,
} from "../libs/activityLog.js";
import { getClientIp } from "../utils/clientIp.js";

/**
 * Writes an activity log row for every API request that changes something
 * (POST / PUT / PATCH / DELETE — succeeded, failed or refused) and for the
 * views listed below. The row is written after the response is sent, so it
 * never slows a request down.
 *
 * Each route below gets a module, an action code and a readable description.
 * A change request missing from the list is still logged, under its method and path.
 */

// a view is logged once per person, page and window — pages refetch every few seconds
const VIEW_WINDOW_MS = 15 * 60_000;

// ---------------------------------------------------------------------
// helpers for descriptions
// ---------------------------------------------------------------------

const count = (list, noun) => {
    const n = Array.isArray(list) ? list.length : 0;
    return `${n} ${noun}${n === 1 ? "" : "s"}`;
};

// multipart bodies carry arrays as JSON strings
const parseList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const docTypes = (documents) =>
    parseList(documents)
        .map((doc) => (typeof doc === "string" ? doc : doc?.documentType))
        .filter(Boolean)
        .join(", ") || "documents";

const fields = (body) => Object.keys(body ?? {}).join(", ") || "no fields";

const quoted = (text, fallback) => (text ? `"${String(text).slice(0, 120)}"` : fallback);

// ---------------------------------------------------------------------
// the catalogue
// ---------------------------------------------------------------------

const route = (method, path, module, action, label, options = {}) => ({ method, path, module, action, label, ...options });

const AUCTION = { type: "AUCTION", param: "auctionUuid" };
const LOT = { type: "LOT", param: "lotUuid" };
const USER = { type: "USER", param: "uuid" };

const ROUTES = [
    // ── sign-up / sign-in ─────────────────────────────────────────────
    route("POST", "/api/auth/register", "AUTH", "SIGNUP_START", "Started sign-up", {
        describe: ({ body }) => `Started sign-up for ${body.email ?? "an email"} — email OTP sent`,
    }),
    route("POST", "/api/auth/verify-otp", "AUTH", "SIGNUP_VERIFY_EMAIL", "Verified sign-up email OTP", {
        failAction: "SIGNUP_VERIFY_EMAIL_FAILED",
    }),
    route("POST", "/api/auth/verify-phone-otp", "AUTH", "SIGNUP_VERIFY_PHONE", "Verified phone OTP — account created", {
        failAction: "SIGNUP_VERIFY_PHONE_FAILED",
    }),
    route("POST", "/api/auth/resend-otp", "AUTH", "SIGNUP_RESEND_OTP", "Requested a new sign-up email OTP", {
        failAction: "SIGNUP_RESEND_OTP_FAILED",
    }),
    route("POST", "/api/auth/resend-phone-otp", "AUTH", "SIGNUP_RESEND_PHONE_OTP", "Requested a new phone OTP (SMS)", {
        failAction: "SIGNUP_RESEND_PHONE_OTP_FAILED",
    }),
    route("POST", "/api/auth/login", "AUTH", "LOGIN", "Logged in", {
        failAction: "LOGIN_FAILED",
        describe: ({ ok, body }) => (ok ? "Logged in" : `Failed login attempt for ${body.email ?? "unknown email"}`),
    }),
    // every open tab renews its session every few minutes — not worth a row
    route("POST", "/api/auth/refresh", "AUTH", "SESSION_REFRESH", "Renewed session", { skip: true }),
    route("POST", "/api/auth/logout", "AUTH", "LOGOUT", "Logged out"),
    // Google Authenticator before the dashboard opens
    route("POST", "/api/auth/mfa/setup", "AUTH", "MFA_SETUP_START", "Opened the authenticator setup (QR code)"),
    route("POST", "/api/auth/mfa/verify", "AUTH", "MFA_VERIFY", "Entered the authenticator code — dashboard opened", {
        failAction: "MFA_VERIFY_FAILED",
        describe: ({ ok, response }) =>
            !ok
                ? "Entered a wrong authenticator code"
                : response?.message === "Authenticator set up"
                  ? "Set up Google Authenticator — dashboard opened"
                  : "Entered the authenticator code — dashboard opened",
    }),

    // ── team / users (super admin) ────────────────────────────────────
    route("PATCH", "/api/admin/:uuid/role", "USER", "USER_ROLE_CHANGE", "Changed a user's role", {
        target: USER,
        describe: ({ body }) => `Changed role to ${body.roleName ?? "?"}`,
    }),
    route("PATCH", "/api/admin/:uuid/status", "USER", "USER_STATUS_CHANGE", "Changed a user's status", {
        target: USER,
        describe: ({ body }) => (body.action === "SUSPEND" ? "Suspended the user" : "Reactivated the user"),
    }),
    route("DELETE", "/api/admin/:uuid/mfa", "USER", "USER_MFA_RESET", "Reset a user's authenticator", { target: USER }),
    route("POST", "/api/admin/create-user", "USER", "USER_CREATE", "Created a user", {
        describe: ({ body }) => `Created ${body.roleName ?? "BIDDER"} account for ${body.fullName ?? "?"} (${body.email ?? "?"})`,
    }),
    route("GET", "/api/admin/activity-logs", "AUDIT", "ACTIVITY_LOGS_VIEW", "Viewed the activity logs", { view: true }),
    route("GET", "/api/admin/activity-logs/export", "AUDIT", "ACTIVITY_LOGS_EXPORT", "Exported the activity logs (CSV)"),
    route("GET", "/api/admin/ip-blocks", "AUTH", "IP_BLOCKS_VIEW", "Viewed the blocked IP addresses", { view: true }),
    route("DELETE", "/api/admin/ip-blocks", "AUTH", "IP_UNBLOCK_ALL", "Unblocked every IP address", {
        describe: ({ ok, response }) => (ok && response?.message ? response.message : "Tried to unblock every IP address"),
    }),
    route("DELETE", "/api/admin/ip-blocks/:ip", "AUTH", "IP_UNBLOCK", "Unblocked an IP address", {
        describe: ({ params }) => `Unblocked IP ${decodeURIComponent(params.ip ?? "?")} for sign-in`,
    }),
    route("GET", "/api/admin/otp-limits", "AUTH", "OTP_LIMITS_VIEW", "Viewed the OTP limits", { view: true }),
    route("DELETE", "/api/admin/otp-limits", "AUTH", "OTP_LIMIT_RESET_ALL", "Reset every OTP limit", {
        describe: ({ ok, response }) => (ok && response?.message ? response.message : "Tried to reset every OTP limit"),
    }),
    route("DELETE", "/api/admin/otp-limits/:kind/:subject", "AUTH", "OTP_LIMIT_RESET", "Reset an OTP limit", {
        describe: ({ params }) => `Reset the ${params.kind ?? "?"} OTP limit for ${decodeURIComponent(params.subject ?? "?")}`,
    }),

    route("GET", "/api/users/:uuid", "USER", "USER_PROFILE_VIEW", "Viewed a user's profile and KYC documents", {
        target: USER,
        view: true,
    }),
    route("PATCH", "/api/users/:uuid/details", "USER", "USER_DETAILS_UPDATE", "Edited a user's details", {
        target: USER,
        describe: ({ body }) => `Edited user details (${fields(body)})`,
    }),

    // ── KYC ───────────────────────────────────────────────────────────
    route("POST", "/api/users/:uuid/kyc", "KYC", "KYC_UPLOAD_FOR_USER", "Uploaded KYC documents for a user", {
        target: USER,
        describe: ({ body }) => `Uploaded KYC documents for the user (${body.kycType ?? "?"}: ${docTypes(body.documents)})`,
    }),
    route("PATCH", "/api/users/:uuid/kyc/review", "KYC", "KYC_REVIEW", "Reviewed KYC documents", {
        target: USER,
        describe: ({ body }) => {
            const reviews = Array.isArray(body.reviews) ? body.reviews : [];
            const approved = reviews.filter((r) => r.action === "APPROVE").length;
            return `Reviewed ${count(reviews, "KYC document")} — ${approved} approved, ${reviews.length - approved} rejected`;
        },
    }),
    route("PATCH", "/api/users/:uuid/kyc/status", "KYC", "KYC_STATUS_SET", "Set KYC status", {
        target: USER,
        describe: ({ body }) =>
            `Marked KYC as ${body.verified ? "verified" : "not verified"}${body.reason ? ` — reason: ${body.reason}` : ""}`,
    }),
    route("POST", "/api/users/:uuid/kyc/request", "KYC", "KYC_DOCUMENTS_REQUEST", "Requested KYC documents", {
        target: USER,
        describe: ({ body }) => `Asked the user to upload: ${docTypes(body.documentTypes)}`,
    }),
    route("POST", "/api/users/me/kyc", "KYC", "KYC_SUBMIT", "Submitted own KYC documents", {
        describe: ({ body }) => `Submitted own KYC documents (${body.kycType ?? "?"}: ${docTypes(body.documents)})`,
    }),

    // ── own account ───────────────────────────────────────────────────
    route("PATCH", "/api/users/me/update-profile", "PROFILE", "PROFILE_UPDATE", "Updated own profile", {
        describe: ({ body }) => `Updated own profile (${fields(body)})`,
    }),
    route("PATCH", "/api/users/me/change-password", "PROFILE", "PASSWORD_CHANGE", "Changed own password", {
        failAction: "PASSWORD_CHANGE_FAILED",
    }),
    route("POST", "/api/users/me/gallery/:lotUuid", "GALLERY", "GALLERY_ADD", "Saved a lot to their gallery", { target: LOT }),
    route("DELETE", "/api/users/me/gallery/:lotUuid", "GALLERY", "GALLERY_REMOVE", "Removed a lot from their gallery", {
        target: LOT,
    }),

    // ── auctions & lots ───────────────────────────────────────────────
    route("POST", "/api/auction/create-auction", "AUCTION", "AUCTION_CREATE", "Created an auction", {
        describe: ({ body }) => `Created auction ${quoted(body.title, "(untitled)")}`,
        targetFromResponse: (response) => ({ type: "AUCTION", id: response?.data?.uuid ?? response?.data?.auction?.uuid }),
    }),
    route("PUT", "/api/auction/update-auction/:auctionUuid", "AUCTION", "AUCTION_UPDATE", "Edited an auction", {
        target: AUCTION,
        describe: ({ body }) => (body.title ? `Edited auction ${quoted(body.title)}` : "Edited the auction"),
    }),
    route("DELETE", "/api/auction/delete-auction/:auctionUuid", "AUCTION", "AUCTION_DELETE", "Deleted an auction", {
        target: AUCTION,
    }),
    route("PATCH", "/api/auction/change-status/:auctionUuid", "AUCTION", "AUCTION_STATUS_CHANGE", "Changed an auction's status", {
        target: AUCTION,
        describe: ({ body }) => `Changed auction status to ${body.status ?? "?"}${body.reason ? ` — reason: ${body.reason}` : ""}`,
    }),
    route("DELETE", "/api/auction/lots/:lotUuid", "LOT", "LOT_DELETE", "Deleted a lot", { target: LOT }),
    route("PATCH", "/api/auction/lots/:lotUuid/live", "LOT", "LOT_LIVE_TOGGLE", "Started / stopped a lot", {
        target: LOT,
        describe: ({ body }) => (body.action === "start" ? "Put the lot on the block (started bidding)" : "Stopped bidding on the lot"),
    }),
    route("POST", "/api/auction/lots/:lotUuid/hammer", "LOT", "LOT_HAMMER", "Hammered a lot", {
        target: LOT,
        describe: ({ ok, response }) => (ok && response?.message ? `Hammer: ${response.message}` : "Tried to hammer the lot"),
    }),
    route("GET", "/api/auction/lots/:lotUuid/bidders", "LOT", "LOT_BIDDERS_VIEW", "Viewed a lot's bidders", {
        target: LOT,
        view: true,
    }),
    route("PATCH", "/api/auction/lots/:lotUuid/bidders/verify", "LOT", "LOT_BIDDERS_VERIFY", "Verified lot bidders", {
        target: LOT,
        describe: ({ body }) => `${body.verified ? "Verified" : "Unverified"} ${count(body.userUuids, "bidder")} on the lot`,
    }),

    // ── auction registrations ─────────────────────────────────────────
    route("GET", "/api/auction/:auctionUuid/participants", "REGISTRATION", "PARTICIPANTS_VIEW", "Viewed an auction's registrations", {
        target: AUCTION,
        view: true,
    }),
    route("POST", "/api/auction/:auctionUuid/participants", "REGISTRATION", "PARTICIPANTS_ADD", "Added users to an auction", {
        target: AUCTION,
        describe: ({ body }) => `Added ${count(body.userUuids, "user")} to the auction`,
    }),
    route("POST", "/api/auction/:auctionUuid/participants/new", "REGISTRATION", "PARTICIPANT_CREATE", "Created a user and added them to an auction", {
        target: AUCTION,
        describe: ({ body }) => `Created ${body.fullName ?? "?"} (${body.email ?? "?"}) and added them to the auction`,
    }),
    route("PATCH", "/api/auction/:auctionUuid/participants/verify", "REGISTRATION", "PARTICIPANTS_VERIFY", "Approved registrations", {
        target: AUCTION,
        describe: ({ body }) => `${body.verified ? "Approved" : "Unapproved"} ${count(body.userUuids, "registration")}`,
    }),
    route("DELETE", "/api/auction/:auctionUuid/participants", "REGISTRATION", "PARTICIPANTS_REMOVE", "Removed registrations", {
        target: AUCTION,
        describe: ({ body }) => `Removed ${count(body.userUuids, "registration")} from the auction`,
    }),
    route("POST", "/api/auction/:auctionUuid/register", "REGISTRATION", "AUCTION_REGISTER", "Registered to bid on an auction", {
        target: AUCTION,
    }),

    // ── bidding ───────────────────────────────────────────────────────
    route("POST", "/api/bidding/lots/:lotUuid/bids", "BIDDING", "BID_PLACE", "Placed a bid", {
        target: LOT,
        failAction: "BID_REJECTED",
        describe: ({ body }) => `Placed a bid of ${body.amount ?? "?"}`,
    }),
    route("POST", "/api/bidding/lots/:lotUuid/proxy", "BIDDING", "PROXY_BID_SET", "Set a proxy bid", {
        target: LOT,
        failAction: "PROXY_BID_REJECTED",
        describe: ({ body }) => `Set a maximum (proxy) bid of ${body.maxAmount ?? "?"}`,
    }),
    route("POST", "/api/bidding/lots/:lotUuid/execute-proxies", "BIDDING", "PROXY_EXECUTE", "Placed proxy bids at the hammer", {
        target: LOT,
        failAction: "PROXY_EXECUTE_FAILED",
        describe: ({ ok, response }) => (ok && response?.message ? `Hammer: ${response.message}` : "Tried to place the proxy bids at the hammer"),
    }),
    route("GET", "/api/bidding/proxy-bids", "BIDDING", "PROXY_BIDS_VIEW", "Viewed the proxy bids", { view: true }),
    route("GET", "/api/bidding/proxy-bids/export", "BIDDING", "PROXY_BIDS_EXPORT", "Exported the proxy bids (CSV)"),
    route("POST", "/api/bidding/lots/:lotUuid/floor-bids", "BIDDING", "FLOOR_BID", "Entered a floor bid", {
        target: LOT,
        failAction: "FLOOR_BID_REJECTED",
        describe: ({ body }) => `Entered a floor bid of ${body.amount ?? "?"} for paddle #${String(body.paddleNumber ?? "?").replace(/^#/, "")}`,
    }),
    route("GET", "/api/bidding/auctions/:auctionUuid/console", "BIDDING", "CONSOLE_OPEN", "Opened the bidding console", {
        target: AUCTION,
        view: true,
    }),
    route("GET", "/api/auction/dashboard/bid-history/lots/:lotUuid", "BIDDING", "LOT_BID_HISTORY_VIEW", "Viewed a lot's bid history", {
        target: LOT,
        view: true,
    }),

    // ── live video ────────────────────────────────────────────────────
    route("POST", "/api/live/:auctionUuid/host-token", "LIVE", "STREAM_HOST", "Opened the live studio (went live)", { target: AUCTION }),
    route("GET", "/api/live/:auctionUuid/token", "LIVE", "STREAM_WATCH", "Watched the live stream", { target: AUCTION, view: true }),
    route("POST", "/api/live/:auctionUuid/viewers/:identity/remove", "LIVE", "STREAM_VIEWER_REMOVE", "Removed a viewer from the stream", {
        target: AUCTION,
        describe: ({ body, params }) =>
            `${body.ban ? "Removed and banned" : "Removed"} viewer ${body.name ?? decodeURIComponent(params.identity ?? "?")}`,
    }),
    route("DELETE", "/api/live/:auctionUuid/bans/:identity", "LIVE", "STREAM_VIEWER_UNBAN", "Unbanned a viewer", {
        target: AUCTION,
        describe: ({ params }) => `Unbanned viewer ${decodeURIComponent(params.identity ?? "?")}`,
    }),

    // ── storefront ────────────────────────────────────────────────────
    route("GET", "/api/auction/public/:auctionUuid", "BROWSE", "AUCTION_VIEW", "Viewed an auction page", { target: AUCTION, view: true }),
    route("GET", "/api/auction/public/:auctionUuid/lots/:lotUuid", "BROWSE", "LOT_VIEW", "Viewed a lot page", { target: LOT, view: true }),

    // ── uploads ───────────────────────────────────────────────────────
    route("POST", "/api/image/upload-image", "UPLOAD", "IMAGE_UPLOAD", "Uploaded an image"),
    route("POST", "/api/image/editor-image", "UPLOAD", "EDITOR_IMAGE_UPLOAD", "Uploaded an image into the description editor"),

    // ── website (Settings → Website) ──────────────────────────────────
    route("POST", "/api/website/home-banners", "WEBSITE", "HOME_BANNER_ADD", "Added a home page banner"),
    route("PATCH", "/api/website/home-banners/reorder", "WEBSITE", "HOME_BANNER_REORDER", "Reordered the home page banners"),
    route("PATCH", "/api/website/home-banners/:uuid", "WEBSITE", "HOME_BANNER_UPDATE", "Edited a home page banner", {
        describe: ({ body }) =>
            typeof body.isActive === "boolean" && Object.keys(body).length === 1
                ? `${body.isActive ? "Showed" : "Hid"} a home page banner`
                : `Edited a home page banner (${fields(body)})`,
    }),
    route("DELETE", "/api/website/home-banners/:uuid", "WEBSITE", "HOME_BANNER_DELETE", "Deleted a home page banner"),
    route("PUT", "/api/website/home-banners/:uuid/images/:device", "WEBSITE", "HOME_BANNER_IMAGE_SET", "Uploaded a home page banner image", {
        describe: ({ params }) => `Uploaded the ${params.device === "desktop" ? "laptop" : params.device} image of a home page banner`,
    }),
    route("DELETE", "/api/website/home-banners/:uuid/images/:device", "WEBSITE", "HOME_BANNER_IMAGE_REMOVE", "Removed a home page banner image", {
        describe: ({ params }) => `Removed the ${params.device} image of a home page banner`,
    }),
];

// "/api/users/:uuid" → regex; *uuid params only match a UUID, so /api/users/stats isn't a user
const compile = (path) => {
    const source = path
        .split("/")
        .map((part) => {
            if (!part.startsWith(":")) return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const name = part.slice(1);
            return /uuid$/i.test(name) ? `(?<${name}>[0-9a-fA-F-]{36})` : `(?<${name}>[^/]+)`;
        })
        .join("/");
    return new RegExp(`^${source}/?$`);
};

const COMPILED = ROUTES.map((entry) => ({ ...entry, regex: compile(entry.path) }));

// every module / action a row can have — the log page's filter lists
export const ACTIVITY_ACTIONS = [
    ...ROUTES.filter((entry) => !entry.skip).flatMap(({ module, action, label, failAction }) => [
        { module, action, label },
        ...(failAction ? [{ module, action: failAction, label: `${label} (failed)` }] : []),
    ]),
    ...SYSTEM_ACTIONS,
];

const MODULE_BY_PREFIX = {
    auth: "AUTH",
    admin: "USER",
    users: "USER",
    auction: "AUCTION",
    bidding: "BIDDING",
    live: "LIVE",
    image: "UPLOAD",
    website: "WEBSITE",
};

const matchRoute = (method, path) => {
    for (const entry of COMPILED) {
        if (entry.method !== method) continue;
        const found = entry.regex.exec(path);
        if (found) return { entry, params: found.groups ?? {} };
    }
    return null;
};

const unlistedChange = (method, path) => ({
    module: MODULE_BY_PREFIX[path.split("/")[2]] ?? "API",
    action: `${method}_REQUEST`,
    label: `${method} ${path}`,
});

const fileSummary = (req) => {
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : req.file ? [req.file] : [];
    return files.length
        ? files.slice(0, 25).map((f) => ({ field: f.fieldname, name: f.originalname, type: f.mimetype, size: f.size }))
        : undefined;
};

const isEmpty = (value) => !value || (typeof value === "object" && Object.keys(value).length === 0);

// ---------------------------------------------------------------------
// middleware
// ---------------------------------------------------------------------

export const activityLogger = (req, res, next) => {
    if (req.method === "OPTIONS" || req.method === "HEAD") return next();

    const path = req.originalUrl.split("?")[0];
    const match = matchRoute(req.method, path);
    if (!match && req.method === "GET") return next(); // reads are logged only when listed
    if (match?.entry.skip) return next();

    const startedAt = performance.now();
    const entry = match?.entry ?? unlistedChange(req.method, path);
    const params = match?.params ?? {};

    // look the target up now, while it still exists (deletes)
    const targetId = entry.target ? params[entry.target.param] : null;
    const targetLabel = entry.target ? getTargetLabel(entry.target.type, targetId) : Promise.resolve(null);

    // keep the JSON reply: its message says what happened ("Lot #3 sold to #1042", "Invalid email or password")
    const sendJson = res.json.bind(res);
    res.json = (body) => {
        res.locals.activityResponse = body;
        return sendJson(body);
    };

    res.on("finish", () => {
        record({ req, res, entry, params, path, targetId, targetLabel, durationMs: performance.now() - startedAt }).catch((err) =>
            console.error("[activity] could not record request:", err.message)
        );
    });

    next();
};

const record = async ({ req, res, entry, params, path, targetId, targetLabel, durationMs }) => {
    const ok = res.statusCode < 400;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const response = res.locals.activityResponse;
    const ip = getClientIp(req);

    // who: the signed-in user; else whoever the controller named (logout), the account
    // just signed in to, or — for sign-in / sign-up — the email that was typed
    const userId = req.user?.userId ?? req.activityActorId ?? identifyFromToken(req)?.userId;
    let actor = userId ? await getActor({ id: userId }) : null;
    if (!actor && response?.data?.user?.uuid) actor = await getActor({ uuid: response.data.user.uuid });
    if (!actor && entry.module === "AUTH" && typeof body.email === "string") {
        actor = (await getActor({ email: body.email })) ?? { id: null, name: null, email: body.email.slice(0, 255), role: null };
    }

    if (entry.view && isRepeat(`${actor?.id ?? ip}|${entry.action}|${targetId ?? ""}`, VIEW_WINDOW_MS)) return;

    const context = { ok, body, params, query: req.query, response };
    let description = entry.describe?.(context) ?? entry.label;
    if (!ok && response?.message) description += ` — failed: ${response.message}`;
    else if (!ok) description += ` — failed (HTTP ${res.statusCode})`;

    let target = entry.target ? { type: entry.target.type, id: targetId } : null;
    if (!target?.id && entry.targetFromResponse) target = entry.targetFromResponse(response);

    await logActivity({
        actor,
        module: entry.module,
        action: ok ? entry.action : entry.failAction ?? entry.action,
        description,
        method: req.method,
        path,
        statusCode: res.statusCode,
        success: ok,
        ip,
        userAgent: req.get("user-agent"),
        targetType: target?.id ? target.type : null,
        targetId: target?.id ?? null,
        targetLabel: target?.id ? (await targetLabel) ?? (await getTargetLabel(target.type, target.id)) : null,
        metadata: {
            ...(req.method !== "GET" && !isEmpty(body) && { request: redact(body) }),
            ...(!isEmpty(req.query) && { query: req.query }),
            ...(!isEmpty(params) && { params }),
            ...(fileSummary(req) && { files: fileSummary(req) }),
            ...(response?.message && { result: response.message }),
            ...(req.get("referer") && { referer: req.get("referer") }),
        },
        durationMs,
    });
};
