import { ZodError } from "zod";

import {
    addLiveViewersService,
    getLiveViewersService,
    listLiveAccessAuctionsService,
    removeLiveViewerService,
    searchLiveViewerCandidatesService,
    setLiveAccessRestrictedService,
} from "../services/liveAccess.services.js";
import {
    addLiveViewersSchema,
    liveAccessAuctionParamsSchema,
    liveAccessCandidatesQuerySchema,
    liveAccessViewerParamsSchema,
    setLiveAccessRestrictedSchema,
} from "../validations/liveAccess.validation.js";

const handleError = (res, error, label, fallback) => {
    if (error instanceof ZodError) {
        return res.status(400).json({ success: false, message: error.issues?.[0]?.message || "Validation failed" });
    }
    const status = error.statusCode || 500;
    if (status >= 500) console.error(`${label} error:`, error);
    return res.status(status).json({ success: false, message: status === 500 ? fallback : error.message });
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// -----------------------------------------------------------------
// GET /api/admin/live-access — upcoming / running auctions and their switch
// -----------------------------------------------------------------

export const getLiveAccessAuctions = async (req, res) => {
    try {
        const data = await listLiveAccessAuctionsService();
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Live access fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get live access", "Failed to fetch live access");
    }
};

// -----------------------------------------------------------------
// GET /api/admin/live-access/:auctionUuid/viewers — the picked bidders
// -----------------------------------------------------------------

export const getLiveViewers = async (req, res) => {
    try {
        const { auctionUuid } = liveAccessAuctionParamsSchema.parse(req.params);
        const data = await getLiveViewersService({ auctionUuid });
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Bidders fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get live viewers", "Failed to fetch the bidders");
    }
};

// -----------------------------------------------------------------
// GET /api/admin/live-access/:auctionUuid/candidates?search&limit — bidders to pick from
// -----------------------------------------------------------------

export const getLiveViewerCandidates = async (req, res) => {
    try {
        const { auctionUuid } = liveAccessAuctionParamsSchema.parse(req.params);
        const query = liveAccessCandidatesQuerySchema.parse(req.query);
        const data = await searchLiveViewerCandidatesService({ auctionUuid, ...query });
        return res.status(200).json({ success: true, message: "Bidders fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Search live viewer candidates", "Failed to search bidders");
    }
};

// -----------------------------------------------------------------
// PATCH /api/admin/live-access/:auctionUuid { restricted }
// -----------------------------------------------------------------

export const setLiveAccessRestricted = async (req, res) => {
    try {
        const { auctionUuid } = liveAccessAuctionParamsSchema.parse(req.params);
        const { restricted } = setLiveAccessRestrictedSchema.parse(req.body ?? {});
        const data = await setLiveAccessRestrictedService({ auctionUuid, restricted });
        return res.status(200).json({
            success: true,
            message: restricted
                ? `"${data.auction.title}" is now only visible to the selected bidders while live`
                : `"${data.auction.title}" is visible to everyone while live`,
            data,
        });
    } catch (error) {
        return handleError(res, error, "Set live access", "Failed to save live access");
    }
};

// -----------------------------------------------------------------
// POST /api/admin/live-access/:auctionUuid/viewers { userUuids }
// -----------------------------------------------------------------

export const addLiveViewers = async (req, res) => {
    try {
        const { auctionUuid } = liveAccessAuctionParamsSchema.parse(req.params);
        const { userUuids } = addLiveViewersSchema.parse(req.body ?? {});
        const data = await addLiveViewersService({ auctionUuid, userUuids, actorId: req.user?.userId });
        const skipped = data.alreadyAdded ? ` (${plural(data.alreadyAdded, "bidder")} already on the list)` : "";
        return res.status(200).json({
            success: true,
            message: `Added ${plural(data.added, "bidder")} to "${data.auction.title}"${skipped}`,
            data,
        });
    } catch (error) {
        return handleError(res, error, "Add live viewers", "Failed to add the bidders");
    }
};

// -----------------------------------------------------------------
// DELETE /api/admin/live-access/:auctionUuid/viewers/:userUuid
// -----------------------------------------------------------------

export const removeLiveViewer = async (req, res) => {
    try {
        const params = liveAccessViewerParamsSchema.parse(req.params);
        const data = await removeLiveViewerService(params);
        const who = data.user.name || data.user.email;
        return res.status(200).json({ success: true, message: `Removed ${who} from "${data.auction.title}"`, data });
    } catch (error) {
        return handleError(res, error, "Remove live viewer", "Failed to remove the bidder");
    }
};
