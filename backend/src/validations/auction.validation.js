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
    filter: z.enum(["all", "verified", "unverified", "registered", "created"]).default("all"),
});

export const verifyLotBiddersSchema = z.object({
    userUuids: z
        .array(z.uuid({ message: "Invalid user id" }))
        .min(1, "Select at least one user")
        .max(200, "You can update at most 200 users at a time"),
    verified: z.boolean({ message: "verified must be true or false" }),
});

export const getAuctionTimelineQuerySchema = z.object({
    type: z.enum(["past", "upcoming"], { message: 'type must be "past" or "upcoming"' }),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
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
