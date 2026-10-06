import { ZodError } from "zod";

import {
    addAuctionParticipantsService,
    addNewUserToAuctionService,
    getAuctionParticipantsService,
    getParticipantCandidatesService,
    registerForAuctionService,
    removeAuctionParticipantsService,
    setParticipantsVerifiedService,
} from "../services/auctionParticipant.services.js";
import { createUserSchema } from "../validations/user.validation.js";
import {
    auctionUuidParamSchema,
    getAuctionParticipantsQuerySchema,
    participantCandidatesQuerySchema,
    participantUserUuidsSchema,
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

const users = (n) => `${n} user${n === 1 ? "" : "s"}`;

// -----------------------------------------------------------------
// GET /api/auction/:auctionUuid/participants?page&limit&search&filter
// Users registered for the auction, with their status on each lot
// -----------------------------------------------------------------

export const getAuctionParticipants = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const query = getAuctionParticipantsQuerySchema.parse(req.query);

        const data = await getAuctionParticipantsService({ auctionUuid, ...query });

        return res.status(200).json({
            success: true,
            message: "Auction registrations fetched successfully",
            data,
        });
    } catch (error) {
        return handleError(res, error, "Get auction participants", "Failed to fetch auction registrations");
    }
};

// -----------------------------------------------------------------
// GET /api/auction/:auctionUuid/participants/candidates?search   (SUPER_ADMIN)
// Users who can be added — not yet registered for the auction
// -----------------------------------------------------------------

export const getParticipantCandidates = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const query = participantCandidatesQuerySchema.parse(req.query);

        const data = await getParticipantCandidatesService({ auctionUuid, ...query });

        return res.status(200).json({ success: true, message: "Users fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get participant candidates", "Failed to fetch users");
    }
};

// -----------------------------------------------------------------
// POST /api/auction/:auctionUuid/participants   (SUPER_ADMIN)
// Body: { userUuids: string[] } — registers existing users for the
// auction and all its lots (pending verification)
// -----------------------------------------------------------------

export const addAuctionParticipants = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const { userUuids } = participantUserUuidsSchema.parse(req.body);

        const result = await addAuctionParticipantsService({ auctionUuid, userUuids, actorId: req.user.userId });

        const message =
            result.added === 0
                ? "Already registered for this auction"
                : `${users(result.added)} registered for this auction` +
                  (result.alreadyRegistered ? ` (${result.alreadyRegistered} already were)` : "");

        return res.status(200).json({ success: true, message, data: result });
    } catch (error) {
        return handleError(res, error, "Add auction participants", "Failed to add users to auction");
    }
};

// -----------------------------------------------------------------
// POST /api/auction/:auctionUuid/participants/new   (SUPER_ADMIN)
// Body: same as create-user { fullName, email, phone, password }
// -----------------------------------------------------------------

export const addNewUserToAuction = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const user = createUserSchema.parse(req.body);

        const result = await addNewUserToAuctionService({ auctionUuid, user, actorId: req.user.userId });

        return res.status(201).json({
            success: true,
            message: `${user.fullName} was created and registered for this auction with paddle #${result.paddleNumber}`,
            data: result,
        });
    } catch (error) {
        return handleError(res, error, "Add new user to auction", "Failed to add user to auction");
    }
};

// -----------------------------------------------------------------
// PATCH /api/auction/:auctionUuid/participants/verify   (SUPER_ADMIN)
// Body: { userUuids: string[], verified: boolean } — on all lots of the auction
// -----------------------------------------------------------------

export const verifyAuctionParticipants = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const { userUuids, verified } = verifyLotBiddersSchema.parse(req.body);

        const result = await setParticipantsVerifiedService({
            auctionUuid,
            userUuids,
            verified,
            actorId: req.user.userId,
        });

        return res.status(200).json({
            success: true,
            message: `${users(result.requested)} ${verified ? "verified" : "unverified"} on all lots`,
            data: result,
        });
    } catch (error) {
        return handleError(res, error, "Verify auction participants", "Failed to update registrations");
    }
};

// -----------------------------------------------------------------
// DELETE /api/auction/:auctionUuid/participants   (SUPER_ADMIN)
// Body: { userUuids: string[] }
// -----------------------------------------------------------------

export const removeAuctionParticipants = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);
        const { userUuids } = participantUserUuidsSchema.parse(req.body);

        const result = await removeAuctionParticipantsService({ auctionUuid, userUuids, actorId: req.user.userId });

        return res.status(200).json({
            success: true,
            message: `${users(result.removed)} removed from this auction`,
            data: result,
        });
    } catch (error) {
        return handleError(res, error, "Remove auction participants", "Failed to remove users from auction");
    }
};

// -----------------------------------------------------------------
// POST /api/auction/:auctionUuid/register   (BIDDER / USER)
// -----------------------------------------------------------------

export const registerForAuction = async (req, res) => {
    try {
        const { auctionUuid } = auctionUuidParamSchema.parse(req.params);

        const registration = await registerForAuctionService({
            auctionUuid,
            userId: req.user.userId,
            role: req.user.role,
        });

        return res.status(200).json({
            success: true,
            message: `Registered for the auction with paddle #${registration.paddleNumber}. You can bid on each lot once an admin verifies you for it.`,
            data: registration,
        });
    } catch (error) {
        return handleError(res, error, "Register for auction", "Failed to register for auction");
    }
};
