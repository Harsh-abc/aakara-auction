import { ZodError } from "zod";

import { getLiveAuctionsService, setLotLiveService } from "../services/liveAuction.services.js";
import { getAuctionTimelineService } from "../services/auctionTimeline.services.js";
import {
    getAuctionTimelineQuerySchema,
    lotUuidParamSchema,
    setLotLiveSchema,
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
// GET /api/auction/live
// LIVE + PAUSED auctions with floor stats
// -----------------------------------------------------------------

export const getLiveAuctions = async (req, res) => {
    try {
        const data = await getLiveAuctionsService();
        return res.status(200).json({
            success: true,
            message: "Live auctions fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get live auctions", "Failed to fetch live auctions");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/timeline?type=past|upcoming&page&limit&search
// Upcoming = SCHEDULED / PREVIEW, Past = ENDED / SETTLED / CANCELLED
// -----------------------------------------------------------------

export const getAuctionTimeline = async (req, res) => {
    try {
        const query = getAuctionTimelineQuerySchema.parse(req.query);
        const data = await getAuctionTimelineService(query);
        return res.status(200).json({
            success: true,
            message: `${query.type === "past" ? "Past" : "Upcoming"} auctions fetched successfully`,
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get auction timeline", "Failed to fetch auctions");
    }
};

// -----------------------------------------------------------------
// PATCH /api/auction/lots/:lotUuid/live   Body: { action: "start" | "stop" }
// One live lot per auction at a time
// -----------------------------------------------------------------

export const setLotLive = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const { action } = setLotLiveSchema.parse(req.body);

        const lot = await setLotLiveService({ lotUuid, action });

        return res.status(200).json({
            success: true,
            message:
                action === "start"
                    ? `Lot #${lot.itemNumber} is now live`
                    : `Lot #${lot.itemNumber} closed as ${lot.status.charAt(0) + lot.status.slice(1).toLowerCase()}`,
            data: lot,
        });
    } catch (error) {
        return handleError(res, error, "Set lot live", "Failed to update the lot");
    }
};
