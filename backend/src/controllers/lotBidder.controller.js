import { ZodError } from "zod";

import {
    getLotBiddersService,
    getLotSummaryService,
    setLotBiddersVerifiedService,
} from "../services/lotBidder.services.js";
import {
    getLotBiddersQuerySchema,
    lotUuidParamSchema,
    verifyLotBiddersSchema,
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
// GET /api/auction/lots/:lotUuid/summary
// Short lot details for the top of the bidders page
// -----------------------------------------------------------------

export const getLotSummary = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const lot = await getLotSummaryService({ lotUuid });

        return res.status(200).json({
            success: true,
            message: "Lot fetched successfully",
            data: lot,
        });
    } catch (error) {
        return handleError(res, error, "Get lot summary", "Failed to fetch lot");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/lots/:lotUuid/bidders?page&limit&search&filter
// Users registered for the lot (via its auction)
// -----------------------------------------------------------------

export const getLotBidders = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const query = getLotBiddersQuerySchema.parse(req.query);

        const data = await getLotBiddersService({ lotUuid, ...query });

        return res.status(200).json({
            success: true,
            message: "Lot bidders fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get lot bidders", "Failed to fetch lot bidders");
    }
};

// -----------------------------------------------------------------
// PATCH /api/auction/lots/:lotUuid/bidders/verify   (SUPER_ADMIN)
// Body: { userUuids: string[], verified: boolean }
// -----------------------------------------------------------------

export const verifyLotBidders = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const { userUuids, verified } = verifyLotBiddersSchema.parse(req.body);

        const result = await setLotBiddersVerifiedService({
            lotUuid,
            userUuids,
            verified,
            actorId: req.user.userId,
        });

        const n = result.requested;
        return res.status(200).json({
            success: true,
            message: `${n} user${n === 1 ? "" : "s"} ${verified ? "verified" : "unverified"} for this lot`,
            data: result,
        });
    } catch (error) {
        return handleError(res, error, "Verify lot bidders", "Failed to update lot bidders");
    }
};
