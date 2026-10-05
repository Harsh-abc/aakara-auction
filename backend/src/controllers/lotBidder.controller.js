import { ZodError } from "zod";

import {
    addNewUserToLotService,
    getLotBiddersService,
    getLotSummaryService,
    registerForLotService,
    setLotBiddersVerifiedService,
} from "../services/lotBidder.services.js";
import { createUserSchema } from "../validations/user.validation.js";
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
// Users who can be verified to bid on the lot
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

// -----------------------------------------------------------------
// POST /api/auction/lots/:lotUuid/bidders   (SUPER_ADMIN)
// Body: same as create-user { fullName, email, phone, password }
// Creates the account and adds it to the lot as a verified bidder
// -----------------------------------------------------------------

export const addNewUserToLot = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);
        const user = createUserSchema.parse(req.body);

        const result = await addNewUserToLotService({ lotUuid, user, actorId: req.user.userId });

        return res.status(201).json({
            success: true,
            message: `${user.fullName} was created and verified to bid on this lot`,
            data: result,
        });
    } catch (error) {
        return handleError(res, error, "Add new user to lot", "Failed to add user to lot");
    }
};

// -----------------------------------------------------------------
// POST /api/auction/lots/:lotUuid/register   (BIDDER / USER)
// -----------------------------------------------------------------

export const registerForLot = async (req, res) => {
    try {
        const { lotUuid } = lotUuidParamSchema.parse(req.params);

        const registration = await registerForLotService({
            lotUuid,
            userId: req.user.userId,
            role: req.user.role,
        });

        return res.status(200).json({
            success: true,
            message:
                registration.status === "VERIFIED"
                    ? "You're verified to bid on this lot"
                    : "Registered. You can bid once an admin verifies you.",
            data: registration,
        });
    } catch (error) {
        return handleError(res, error, "Register for lot", "Failed to register for lot");
    }
};
