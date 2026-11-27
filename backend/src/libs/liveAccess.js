import prisma from "./prisma.js";
import { isDashboardRole } from "./dashboardMfa.js";

// =====================================================================
// Settings → Live Access. An auction with liveAccessRestricted on is, while
// it's LIVE or PAUSED, only for staff (dashboard roles) and the bidders picked
// for it (auction_live_viewers). To everyone else — guests included — the sale
// doesn't exist: it's left out of the storefront lists and hero (which then show
// the next sale or the default "coming soon" banner), its pages answer
// LIVE_ACCESS_RESTRICTED, and its live room, video and bidding are closed.
// Before it opens, and once it's over, it's an ordinary sale again.
//
// `viewer` everywhere is { userId, role } from the access token, or null for a guest.
// =====================================================================

export const LIVE_STATUSES = ["LIVE", "PAUSED"];

export const LIVE_ACCESS_RESTRICTED = "LIVE_ACCESS_RESTRICTED";
export const LIVE_ACCESS_MESSAGE = "This auction isn't open to you right now.";

const isStaff = (viewer) => isDashboardRole(viewer?.role);

const toBigInt = (value) => {
    try {
        return BigInt(value);
    } catch {
        return null;
    }
};

/**
 * A Prisma `where` piece for auction queries: leaves out the restricted live sales this
 * viewer may not see. AND it into the query (it's {} for staff).
 */
export const liveAccessWhere = (viewer) => {
    if (isStaff(viewer)) return {};
    const userId = viewer?.userId ? toBigInt(viewer.userId) : null;
    return {
        NOT: {
            liveAccessRestricted: true,
            status: { in: LIVE_STATUSES },
            ...(userId ? { liveViewers: { none: { userId } } } : {}),
        },
    };
};

/** May `viewer` see this auction? `auction` needs id, status and liveAccessRestricted. */
export const canSeeAuction = async (auction, viewer) => {
    if (!auction?.liveAccessRestricted || !LIVE_STATUSES.includes(auction.status) || isStaff(viewer)) return true;
    const userId = viewer?.userId ? toBigInt(viewer.userId) : null;
    if (!userId) return false;
    const row = await prisma.auctionLiveViewer.findUnique({
        where: { auctionId_userId: { auctionId: auction.id, userId } },
        select: { id: true },
    });
    return Boolean(row);
};

export const liveAccessError = () =>
    Object.assign(new Error(LIVE_ACCESS_MESSAGE), { statusCode: 403, code: LIVE_ACCESS_RESTRICTED });

/** Throws LIVE_ACCESS_RESTRICTED (403) unless `viewer` may see the auction. */
export const assertCanSeeAuction = async (auction, viewer) => {
    if (!(await canSeeAuction(auction, viewer))) throw liveAccessError();
};

// ---------------------------------------------------------------------
// bidding runs on every bid, so its answer is kept for a few seconds per
// bidder and sale. Changes made on this server clear it straight away.
// ---------------------------------------------------------------------

const BID_CACHE_MS = 5_000;
const bidCache = new Map(); // `${auctionId}:${userId}` → { at, allowed }

/** May this bidder bid in the auction (by id) right now, as far as Live Access goes? */
export const canBidInAuction = async (auctionId, userId) => {
    const key = `${auctionId}:${userId}`;
    const hit = bidCache.get(key);
    if (hit && Date.now() - hit.at < BID_CACHE_MS) return hit.allowed;

    const auction = await prisma.auction.findUnique({
        where: { id: BigInt(auctionId) },
        select: { id: true, status: true, liveAccessRestricted: true },
    });
    const allowed = await canSeeAuction(auction, { userId, role: "BIDDER" });
    if (bidCache.size > 5_000) bidCache.clear();
    bidCache.set(key, { at: Date.now(), allowed });
    return allowed;
};

export const clearLiveAccessCache = () => bidCache.clear();
