import { z } from "zod";

export const liveAccessAuctionParamsSchema = z.object({
    auctionUuid: z.uuid({ message: "Invalid auction id" }),
});

export const liveAccessViewerParamsSchema = z.object({
    auctionUuid: z.uuid({ message: "Invalid auction id" }),
    userUuid: z.uuid({ message: "Invalid user id" }),
});

export const liveAccessCandidatesQuerySchema = z.object({
    search: z.string().trim().max(100).optional().default(""),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const setLiveAccessRestrictedSchema = z.object({
    restricted: z.boolean({ message: "restricted must be true or false" }),
});

export const addLiveViewersSchema = z.object({
    userUuids: z.array(z.uuid({ message: "Invalid user id" })).min(1, "Pick at least one bidder").max(200, "Add at most 200 bidders at a time"),
});
