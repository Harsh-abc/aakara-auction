import { ZodError } from "zod";

import {
    executeProxiesService,
    getAuctionActivityService,
    getAuctionConsoleService,
    getLotProxyBiddersService,
    getMyLotStandingService,
    getStaffProxyOptionsService,
    placeBidService,
    placeFloorBidService,
    sendLotCalloutService,
    setProxyBidForBidderService,
    setProxyBidService,
} from "../services/bidding.services.js";
import { auctionUuidParamSchema, lotUuidParamSchema } from "../validations/auction.validation.js";
import { bidderUuidParamSchema, lotCalloutSchema, placeBidSchema, placeFloorBidSchema, setProxyBidSchema } from "../validations/bidding.validation.js";
import { getClientIp } from "../utils/clientIp.js";

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

const clientInfo = (req) => ({ ip: getClientIp(req), userAgent: req.get("user-agent") ?? null });

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
// PUT /api/bidding/lots/:lotUuid/proxy-bids/:bidderUuid   Body: { maxAmount }
// Super admin: set or change a registered bidder's proxy on a lot, until the auction goes live
// -----------------------------------------------------------------

export const setProxyBidForBidder = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const { bidderUuid } = bidderUuidParamSchema.parse(req.params);
        const { maxAmount } = setProxyBidSchema.parse(req.body);
        const { message, data } = await setProxyBidForBidderService({ lotUuid, bidderUuid, maxAmount, staffUserId: req.user?.userId });
        return res.status(200).json({ success: true, message, data });
    } catch (error) {
        return handleError(res, error, "Set proxy bid for bidder", "Failed to set the proxy bid");
    }
};

// -----------------------------------------------------------------
// GET /api/bidding/proxy-bids/staff-options
// Super admin: auctions (scheduled, not live) and their unopened lots, for "Add proxy bid"
// -----------------------------------------------------------------

export const getStaffProxyOptions = async (req, res) => {
    try {
        const data = await getStaffProxyOptionsService();
        return res.status(200).json({ success: true, message: "Proxy bid options fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get staff proxy options", "Failed to fetch the auctions and lots");
    }
};

// -----------------------------------------------------------------
// GET /api/bidding/lots/:lotUuid/proxy-bidders
// Super admin: bidders verified on the lot, with their paddle and current proxy
// -----------------------------------------------------------------

export const getLotProxyBidders = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const data = await getLotProxyBiddersService({ lotUuid });
        return res.status(200).json({ success: true, message: "Lot bidders fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get lot proxy bidders", "Failed to fetch the lot's bidders");
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

// -----------------------------------------------------------------
// GET /api/bidding/auctions/:auctionUuid/console
// Auctioneer console: the live lot, its position, bid log and floor paddles
// -----------------------------------------------------------------

export const getAuctionConsole = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await getAuctionConsoleService({ auctionUuid });
        return res.status(200).json({ success: true, message: "Console fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get auction console", "Failed to load the bidding console");
    }
};

// -----------------------------------------------------------------
// POST /api/bidding/lots/:lotUuid/floor-bids   Body: { paddleNumber, amount }
// Auctioneer enters a bid for a paddle in the room (online / hybrid sales)
// -----------------------------------------------------------------

export const placeFloorBid = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const { paddleNumber, amount } = placeFloorBidSchema.parse(req.body ?? {});
        const { message, data } = await placeFloorBidService({ lotUuid, paddleNumber, amount, ...clientInfo(req) });
        return res.status(201).json({ success: true, message, data });
    } catch (error) {
        return handleError(res, error, "Place floor bid", "Failed to place the floor bid");
    }
};

// -----------------------------------------------------------------
// POST /api/bidding/lots/:lotUuid/execute-proxies
// Hammer step 1: the lot's proxy bids are placed against the standing bid
// (the highest takes the lead); the console then counts down and sells
// -----------------------------------------------------------------

export const executeProxies = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const { message, data } = await executeProxiesService({ lotUuid });
        return res.status(200).json({ success: true, message, data });
    } catch (error) {
        return handleError(res, error, "Execute proxy bids", "Failed to place the proxy bids");
    }
};

// -----------------------------------------------------------------
// POST /api/bidding/lots/:lotUuid/callouts   Body: { message }
// The auctioneer's words to the room, shown to everyone watching the live lot
// -----------------------------------------------------------------

export const sendLotCallout = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const { message: text } = lotCalloutSchema.parse(req.body ?? {});
        const { message, data } = await sendLotCalloutService({ lotUuid, message: text });
        return res.status(201).json({ success: true, message, data });
    } catch (error) {
        return handleError(res, error, "Send callout", "Failed to send the message");
    }
};
