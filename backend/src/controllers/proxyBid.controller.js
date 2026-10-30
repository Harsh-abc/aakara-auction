import { ZodError } from "zod";

import {
    exportProxyBidsService,
    getLotProxiesService,
    getProxyBidsService,
    getProxyBidSummaryService,
    getProxySettingsService,
    setProxyBiddingService,
} from "../services/proxyBid.services.js";
import { auctionUuidParamSchema, lotUuidParamSchema } from "../validations/auction.validation.js";
import {
    getProxyBidsQuerySchema,
    proxyBidFiltersSchema,
    proxyBidSummaryQuerySchema,
    setProxyBiddingSchema,
} from "../validations/bidding.validation.js";

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
// GET /api/bidding/proxy-bids?page&limit&search&auctionUuid&stage&ip&userUuid
// Every proxy bid with its bidder, IP, device and result
// -----------------------------------------------------------------

export const getProxyBids = async (req, res) => {
    try {
        const query = getProxyBidsQuerySchema.parse(req.query);
        const data = await getProxyBidsService(query);
        return res.status(200).json({ success: true, message: "Proxy bids fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get proxy bids", "Failed to fetch the proxy bids");
    }
};

// -----------------------------------------------------------------
// GET /api/bidding/proxy-bids/summary?auctionUuid — totals, and the auctions to filter by
// -----------------------------------------------------------------

export const getProxyBidSummary = async (req, res) => {
    try {
        const query = proxyBidSummaryQuerySchema.parse(req.query);
        const data = await getProxyBidSummaryService(query);
        return res.status(200).json({ success: true, message: "Proxy bid summary fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get proxy bid summary", "Failed to fetch the proxy bid summary");
    }
};

// -----------------------------------------------------------------
// GET /api/bidding/lots/:lotUuid/proxies
// One lot's proxy bids, strongest first (bid history, console) — IP / device for admins only
// -----------------------------------------------------------------

export const getLotProxies = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const data = await getLotProxiesService({ lotUuid, role: req.user?.role });
        return res.status(200).json({ success: true, message: "Lot proxy bids fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get lot proxy bids", "Failed to fetch the lot's proxy bids");
    }
};

// -----------------------------------------------------------------
// GET /api/bidding/proxy-bids/settings — upcoming and running auctions with their proxy switch
// -----------------------------------------------------------------

export const getProxySettings = async (req, res) => {
    try {
        const data = await getProxySettingsService();
        return res.status(200).json({ success: true, message: "Proxy bid settings fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get proxy bid settings", "Failed to fetch the proxy bid settings");
    }
};

// -----------------------------------------------------------------
// PATCH /api/bidding/auctions/:auctionUuid/proxy-bidding { enabled }
// -----------------------------------------------------------------

export const setProxyBidding = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const { enabled } = setProxyBiddingSchema.parse(req.body);
        const data = await setProxyBiddingService({ auctionUuid, enabled });
        return res.status(200).json({
            success: true,
            message: `Proxy bids turned ${enabled ? "on" : "off"} for ${data.title}`,
            data,
        });
    } catch (error) {
        return handleError(res, error, "Set proxy bidding", "Failed to change proxy bidding");
    }
};

// -----------------------------------------------------------------
// GET /api/bidding/proxy-bids/export — same filters, CSV (newest 10,000 rows)
// -----------------------------------------------------------------

export const exportProxyBids = async (req, res) => {
    try {
        const filters = proxyBidFiltersSchema.parse(req.query);
        const csv = await exportProxyBidsService(filters);
        const stamp = new Date().toISOString().slice(0, 10);
        res.set("Content-Type", "text/csv; charset=utf-8");
        res.set("Content-Disposition", `attachment; filename="proxy-bids-${stamp}.csv"`);
        res.set("Cache-Control", "no-store");
        return res.status(200).send(csv);
    } catch (error) {
        return handleError(res, error, "Export proxy bids", "Failed to export the proxy bids");
    }
};
