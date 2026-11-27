import { ZodError } from "zod";

import {
    getFeaturedAuctionService,
    getPublicAuctionService,
    getPublicAuctionsService,
    getPublicLotService,
    getPublicLotsService,
} from "../services/publicAuction.services.js";
import {
    auctionUuidParamSchema,
    getPublicAuctionsQuerySchema,
    getPublicLotsQuerySchema,
    publicLotParamsSchema,
} from "../validations/auction.validation.js";

const handleError = (res, error, label, fallback) => {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: error.issues?.[0]?.message || "Validation failed",
        });
    }
    const status = error.statusCode || 500;
    if (status >= 500) console.error(`${label} error:`, error);
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
        // LIVE_ACCESS_RESTRICTED → the storefront shows its "coming soon" page
        ...(error.code && { code: error.code }),
    });
};

// the signed-in user (optionalAuthenticate), or null for a guest — Settings → Live Access
// can hide a live sale from everyone but the bidders picked for it
const viewerOf = (req) => (req.user ? { userId: req.user.userId, role: req.user.role } : null);

// -----------------------------------------------------------------
// GET /api/auction/public/featured
// Hero sale for the storefront â€” live now, else the next to open (data is null when none)
// -----------------------------------------------------------------

export const getFeaturedAuction = async (req, res) => {
    try {
        const data = await getFeaturedAuctionService({ viewer: viewerOf(req) });
        return res.status(200).json({
            success: true,
            message: data ? "Featured auction fetched successfully" : "No upcoming auctions",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get featured auction", "Failed to fetch the featured auction");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/public?type=upcoming|past&page&limit&search
// Upcoming = LIVE / PAUSED / SCHEDULED / PREVIEW, Past = ENDED / SETTLED
// -----------------------------------------------------------------

export const getPublicAuctions = async (req, res) => {
    try {
        const query = getPublicAuctionsQuerySchema.parse(req.query);
        const data = await getPublicAuctionsService({ ...query, viewer: viewerOf(req) });
        return res.status(200).json({
            success: true,
            message: `${query.type === "past" ? "Past" : "Upcoming"} auctions fetched successfully`,
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get public auctions", "Failed to fetch auctions");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/public/:auctionUuid
// One published sale (404 for drafts, cancelled and invite-only sales)
// -----------------------------------------------------------------

export const getPublicAuction = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await getPublicAuctionService({ auctionUuid, viewer: viewerOf(req) });
        return res.status(200).json({ success: true, message: "Auction fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get public auction", "Failed to fetch the auction");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/public/:auctionUuid/lots?page&limit&search&sort=status|lot|estimate-asc|estimate-desc|bid-desc
// -----------------------------------------------------------------

export const getPublicLots = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const query = getPublicLotsQuerySchema.parse(req.query);
        const data = await getPublicLotsService({ auctionUuid, ...query, viewer: viewerOf(req) });
        return res.status(200).json({ success: true, message: "Lots fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get public lots", "Failed to fetch lots");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/public/:auctionUuid/lots/:lotUuid
// One lot with its bid ladder and next valid bid, plus the sale's order of sale
// -----------------------------------------------------------------

export const getPublicLot = async (req, res) => {
    try {
        const params = publicLotParamsSchema.parse(req.params);
        const data = await getPublicLotService({ ...params, viewer: viewerOf(req) });
        return res.status(200).json({ success: true, message: "Lot fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get public lot", "Failed to fetch the lot");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/dashboard/preview/:auctionUuid/lots/:lotUuid  (staff only)
// The storefront lot page's data for any sale â€” drafts and invite-only included
// -----------------------------------------------------------------

export const getLotPreview = async (req, res) => {
    try {
        const params = publicLotParamsSchema.parse(req.params);
        const data = await getPublicLotService({ ...params, preview: true });
        return res.status(200).json({ success: true, message: "Lot fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get lot preview", "Failed to fetch the lot");
    }
};
