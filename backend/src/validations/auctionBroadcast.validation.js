import { z } from "zod";

export const broadcastAuctionParamsSchema = z.object({
    auctionUuid: z.uuid({ message: "Invalid auction id" }),
});

export const broadcastRecipientsQuerySchema = z.object({
    search: z.string().trim().max(100).optional().default(""),
    status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional(),
});

export const sendAuctionMessageSchema = z
    .object({
        subject: z.string().trim().min(1, "Add a subject").max(200, "Keep the subject under 200 characters"),
        heading: z.string().trim().max(120, "Keep the heading under 120 characters").optional().default(""),
        message: z.string().trim().min(1, "Write a message").max(10000, "Keep the message under 10,000 characters"),
        userUuids: z.array(z.uuid({ message: "Invalid user id" })).max(2000, "Send to at most 2000 bidders at a time").optional().default([]),
        // true: one copy to the super admin sending it, nobody else
        test: z.boolean().optional().default(false),
    })
    .refine((body) => body.test || body.userUuids.length > 0, { message: "Pick at least one bidder", path: ["userUuids"] });
