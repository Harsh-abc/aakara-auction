import { ZodError } from "zod";

import {
    getAuctionBidHistoryService,
    getBidHistoryAuctionsService,
    getDashboardCalendarService,
    getDashboardOverviewService,
    getLotBidHistoryService,
} from "../services/dashboard.services.js";
import {
    auctionUuidParamSchema,
    getBidHistoryAuctionsQuerySchema,
    getDashboardCalendarQuerySchema,
    lotUuidParamSchema,
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
// GET /api/auction/dashboard/overview
// Stat cards, upcoming sales, running sales and the latest bids
// -----------------------------------------------------------------

export const getDashboardOverview = async (req, res) => {
    try {
        const data = await getDashboardOverviewService();
        return res.status(200).json({
            success: true,
            message: "Dashboard fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get dashboard overview", "Failed to fetch the dashboard");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/dashboard/calendar?month=YYYY-MM
// Published sales overlapping the month
// -----------------------------------------------------------------

export const getDashboardCalendar = async (req, res) => {
    try {
        const query = getDashboardCalendarQuerySchema.parse(req.query);
        const data = await getDashboardCalendarService(query);
        return res.status(200).json({
            success: true,
            message: "Auction calendar fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get dashboard calendar", "Failed to fetch the auction calendar");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/dashboard/bid-history?status=all|live|past&search&page&limit
// Running and finished sales, with their bid totals
// -----------------------------------------------------------------

export const getBidHistoryAuctions = async (req, res) => {
    try {
        const query = getBidHistoryAuctionsQuerySchema.parse(req.query);
        const data = await getBidHistoryAuctionsService(query);
        return res.status(200).json({
            success: true,
            message: "Bid history fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get bid history auctions", "Failed to fetch the bid history");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/dashboard/bid-history/:auctionUuid
// A sale's lots with their bid totals and top bidder
// -----------------------------------------------------------------

export const getAuctionBidHistory = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await getAuctionBidHistoryService({ auctionUuid });
        return res.status(200).json({
            success: true,
            message: "Auction bid history fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get auction bid history", "Failed to fetch the auction's bid history");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/dashboard/bid-history/lots/:lotUuid
// Every bid on a lot and a line per bidder
// -----------------------------------------------------------------

export const getLotBidHistory = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const data = await getLotBidHistoryService({ lotUuid });
        return res.status(200).json({
            success: true,
            message: "Lot bid history fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get lot bid history", "Failed to fetch the lot's bid history");
    }
};
