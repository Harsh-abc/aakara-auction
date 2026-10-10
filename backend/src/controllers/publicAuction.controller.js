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
    console.error(`${label} error:`, error);
    const status = error.statusCode || 500;
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
    });
};

// -----------------------------------------------------------------
// GET /api/auction/public/featured
// Hero sale for the storefront — live now, else the next to open (data is null when none)
// -----------------------------------------------------------------

export const getFeaturedAuction = async (req, res) => {
    try {
        const data = await getFeaturedAuctionService();
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
        const data = await getPublicAuctionsService(query);
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
        const data = await getPublicAuctionService({ auctionUuid });
        return res.status(200).json({ success: true, message: "Auction fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get public auction", "Failed to fetch the auction");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/public/:auctionUuid/lots?page&limit&search&sort=lot|estimate-asc|estimate-desc|bid-desc
// -----------------------------------------------------------------

export const getPublicLots = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const query = getPublicLotsQuerySchema.parse(req.query);
        const data = await getPublicLotsService({ auctionUuid, ...query });
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
        const data = await getPublicLotService(params);
        return res.status(200).json({ success: true, message: "Lot fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get public lot", "Failed to fetch the lot");
    }
};
