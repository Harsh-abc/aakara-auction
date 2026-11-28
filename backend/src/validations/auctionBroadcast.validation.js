import { z } from "zod";

export const broadcastAuctionParamsSchema = z.object({
    auctionUuid: z.uuid({ message: "Invalid auction id" }),
});

export const broadcastRecipientsQuerySchema = z.object({
    search: z.string().trim().max(100).optional().default(""),
    status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional(),
});

const draftFields = {
    subject: z.string().trim().min(1, "Add a subject").max(200, "Keep the subject under 200 characters"),
    heading: z.string().trim().max(120, "Keep the heading under 120 characters").optional().default(""),
    // rich text (HTML from the editor) — cleaned on the server before it goes out (mail/richText.js)
    message: z.string().min(1, "Write a message").max(200000, "The message is too long"),
    // start the email with "Dear <name>,"
    greeting: z.boolean().optional().default(true),
    userUuids: z.array(z.uuid({ message: "Invalid user id" })).max(2000, "Send to at most 2000 bidders at a time").optional().default([]),
};

export const previewAuctionMessageSchema = z.object(draftFields);

export const sendAuctionMessageSchema = z
    .object({
        ...draftFields,
        // true: one copy to the super admin sending it, nobody else
        test: z.boolean().optional().default(false),
    })
    .refine((body) => body.test || body.userUuids.length > 0, { message: "Pick at least one bidder", path: ["userUuids"] });
