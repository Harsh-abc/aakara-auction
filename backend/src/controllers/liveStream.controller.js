import { ZodError } from "zod";

import {
    createHostTokenService,
    createViewerTokenService,
    getBansService,
    getOnAirService,
    getWatchAccessService,
    getWatchersService,
    removeViewerService,
    unbanViewerService,
} from "../services/liveStream.services.js";
import { emitTo, rooms } from "../libs/socket.js";
import { auctionUuidParamSchema } from "../validations/auction.validation.js";
import { removeViewerBodySchema, viewerIdentityParamSchema } from "../validations/liveStream.validation.js";

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
        ...(error.code && status !== 500 ? { code: error.code } : {}),
    });
};

// -----------------------------------------------------------------
// GET /api/live/:auctionUuid/token
// Watch-only LiveKit token for the auction's stream — eligible bidders (and staff) only
// -----------------------------------------------------------------

export const getViewerToken = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await createViewerTokenService({
            auctionUuid,
            userId: req.user?.userId,
            role: req.user?.role,
            userAgent: req.get("user-agent"),
        });
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Live stream token created", data });
    } catch (error) {
        return handleError(res, error, "Get live stream token", "Failed to join the live stream");
    }
};

// -----------------------------------------------------------------
// GET /api/live/:auctionUuid/access
// May the signed-in user open the live room page? { allowed, code, message }
// -----------------------------------------------------------------

export const getWatchAccess = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await getWatchAccessService({ auctionUuid, userId: req.user?.userId, role: req.user?.role });
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Live room access checked", data });
    } catch (error) {
        return handleError(res, error, "Get live room access", "Failed to check live room access");
    }
};

// -----------------------------------------------------------------
// POST /api/live/:auctionUuid/host-token
// Studio: publish camera / mic / screen into the auction's room
// -----------------------------------------------------------------

export const getHostToken = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await createHostTokenService({ auctionUuid, userId: req.user?.userId });
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Studio token created", data });
    } catch (error) {
        return handleError(res, error, "Get studio token", "Failed to open the studio");
    }
};

// -----------------------------------------------------------------
// GET /api/live/on-air
// Auctions being streamed right now, with their viewer counts
// -----------------------------------------------------------------

export const getOnAir = async (req, res) => {
    try {
        const data = await getOnAirService();
        return res.status(200).json({ success: true, message: "On-air streams fetched", data });
    } catch (error) {
        return handleError(res, error, "Get on-air streams", "Failed to fetch live streams");
    }
};

// -----------------------------------------------------------------
// POST /api/live/:auctionUuid/viewers/:identity/remove   Body: { ban?, name? }
// Remove a viewer now; with ban they can't rejoin this auction's stream
// -----------------------------------------------------------------

export const removeViewer = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const { identity } = viewerIdentityParamSchema.parse(req.params);
        const { ban, name } = removeViewerBodySchema.parse(req.body ?? {});
        const { message, viewerUserId } = await removeViewerService({ auctionUuid, identity, ban, name, userId: req.user?.userId });
        // close the stream on their open live room page(s) too — even while off air, when they aren't in LiveKit
        if (viewerUserId) {
            emitTo(rooms.user(viewerUserId), "live:removed", {
                auctionUuid,
                banned: ban,
                message: ban ? "You have been removed from this live stream." : "You have been removed from this live stream. Reload the page to rejoin.",
            });
        }
        return res.status(200).json({ success: true, message });
    } catch (error) {
        return handleError(res, error, "Remove viewer", "Failed to remove the viewer");
    }
};

// -----------------------------------------------------------------
// GET /api/live/:auctionUuid/watchers
// Signed-in bidders / staff with the live room page open right now, by name
// -----------------------------------------------------------------

export const getWatchers = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await getWatchersService({ auctionUuid });
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Live room watchers fetched", data });
    } catch (error) {
        return handleError(res, error, "Get live room watchers", "Failed to fetch who is watching");
    }
};

// -----------------------------------------------------------------
// GET /api/live/:auctionUuid/bans
// DELETE /api/live/:auctionUuid/bans/:identity
// -----------------------------------------------------------------

export const getBans = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const data = await getBansService({ auctionUuid });
        return res.status(200).json({ success: true, message: "Banned viewers fetched", data });
    } catch (error) {
        return handleError(res, error, "Get banned viewers", "Failed to fetch banned viewers");
    }
};

export const unbanViewer = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const { identity } = viewerIdentityParamSchema.parse(req.params);
        const { message } = await unbanViewerService({ auctionUuid, identity });
        return res.status(200).json({ success: true, message });
    } catch (error) {
        return handleError(res, error, "Unban viewer", "Failed to unban the viewer");
    }
};
