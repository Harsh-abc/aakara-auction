import { ZodError } from "zod";

import {
    getAuctionActivityService,
    getMyLotStandingService,
    placeBidService,
    setProxyBidService,
} from "../services/bidding.services.js";
import { auctionUuidParamSchema, lotUuidParamSchema } from "../validations/auction.validation.js";
import { placeBidSchema, setProxyBidSchema } from "../validations/bidding.validation.js";

const handleError = (res, error, label, fallback) => {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: error.issues?.[0]?.message || "Validation failed",
        });
    }
    const status = error.statusCode || 500;
    if (status === 500) console.error(`${label} error:`, error);
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
        // e.g. { nextBid } when a bid was too low, so the dialog can correct itself
        ...(error.details ? { data: error.details } : {}),
    });
};

const clientInfo = (req) => ({ ip: req.ip ?? null, userAgent: req.get("user-agent") ?? null });

// -----------------------------------------------------------------
// GET /api/bidding/lots/:lotUuid/me
// The signed-in bidder's registration, position and proxy on a lot
// -----------------------------------------------------------------

export const getMyLotStanding = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const data = await getMyLotStandingService({ lotUuid, userId: req.user?.userId });
        return res.status(200).json({ success: true, message: "Standing fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get lot standing", "Failed to fetch your standing on this lot");
    }
};

// -----------------------------------------------------------------
// POST /api/bidding/lots/:lotUuid/bids   Body: { amount }
// Verified lot bidders only, while the lot is live
// -----------------------------------------------------------------

export const placeBid = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const { amount } = placeBidSchema.parse(req.body);
        const { message, data } = await placeBidService({ lotUuid, userId: req.user?.userId, amount, ...clientInfo(req) });
        return res.status(201).json({ success: true, message, data });
    } catch (error) {
        return handleError(res, error, "Place bid", "Failed to place the bid");
    }
};

// -----------------------------------------------------------------
// POST /api/bidding/lots/:lotUuid/proxy   Body: { maxAmount }
// Set or raise a proxy (maximum) bid — live or upcoming lots
// -----------------------------------------------------------------

export const setProxyBid = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const { maxAmount } = setProxyBidSchema.parse(req.body);
        const { message, data } = await setProxyBidService({ lotUuid, userId: req.user?.userId, maxAmount, ...clientInfo(req) });
        return res.status(201).json({ success: true, message, data });
    } catch (error) {
        return handleError(res, error, "Set proxy bid", "Failed to set the proxy bid");
    }
};

// -----------------------------------------------------------------
// GET /api/bidding/auctions/:auctionUuid/activity
// Dashboard: bid feed, totals, top bidders and proxies in play
// -----------------------------------------------------------------

export const getAuctionActivity = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await getAuctionActivityService({ auctionUuid });
        return res.status(200).json({ success: true, message: "Bidding activity fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get auction activity", "Failed to fetch bidding activity");
    }
};
