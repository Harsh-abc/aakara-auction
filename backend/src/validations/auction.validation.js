import { z } from "zod";

// must match the AuctionStatus enum in prisma/schema.prisma
export const AUCTION_STATUSES = [
    "DRAFT",
    "SCHEDULED",
    "PREVIEW",
    "LIVE",
    "PAUSED",
    "ENDED",
    "SETTLED",
    "CANCELLED",
];

export const lotUuidParamSchema = z.object({
    lotUuid: z.uuid({ message: "Invalid lot id" }),
});

export const getLotBiddersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    filter: z.enum(["all", "verified", "pending"]).default("all"),
});

export const verifyLotBiddersSchema = z.object({
    userUuids: z
        .array(z.uuid({ message: "Invalid user id" }))
        .min(1, "Select at least one user")
        .max(200, "You can update at most 200 users at a time"),
    verified: z.boolean({ message: "verified must be true or false" }),
});

export const auctionUuidParamSchema = z.object({
    auctionUuid: z.uuid({ message: "Invalid auction id" }),
});

export const publicLotParamsSchema = auctionUuidParamSchema.extend(lotUuidParamSchema.shape);

// bidders tick the auction's terms in the register dialog
export const registerForAuctionBodySchema = z.object({
    acceptTerms: z.literal(true, { message: "Please accept the terms and conditions to register" }),
});

export const getAuctionParticipantsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    filter: z.enum(["all", "awaiting", "self", "admin"]).default("all"),
});

export const participantCandidatesQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const participantUserUuidsSchema = z.object({
    userUuids: verifyLotBiddersSchema.shape.userUuids,
});

export const getAuctionTimelineQuerySchema = z.object({
    type: z.enum(["past", "upcoming"], { message: 'type must be "past" or "upcoming"' }),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
});

// storefront list — "upcoming" also covers sales that are live right now
export const getPublicAuctionsQuerySchema = z.object({
    type: z.enum(["past", "upcoming"], { message: 'type must be "past" or "upcoming"' }),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    search: z.string().trim().max(100).optional(),
});

// storefront auction page — lots of one sale
export const PUBLIC_LOT_SORTS = ["lot", "estimate-asc", "estimate-desc", "bid-desc"];

export const getPublicLotsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(60).default(12),
    search: z.string().trim().max(100).optional(),
    sort: z.enum(PUBLIC_LOT_SORTS, { message: "Invalid sort" }).default("lot"),
});

export const setLotLiveSchema = z.object({
    action: z.enum(["start", "stop"], { message: 'action must be "start" or "stop"' }),
});

export const changeAuctionStatusSchema = z.object({
    status: z.enum(AUCTION_STATUSES, { message: "Invalid auction status" }),
    reason: z
        .string()
        .trim()
        .max(500, "Reason must be 500 characters or fewer")
        .optional()
        .nullable(),
});
