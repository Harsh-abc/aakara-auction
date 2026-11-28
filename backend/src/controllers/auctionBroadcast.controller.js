import { ZodError } from "zod";

import {
    listBroadcastAuctionsService,
    listBroadcastRecipientsService,
    previewAuctionMessageService,
    sendAuctionMessageService,
} from "../services/auctionBroadcast.services.js";
import {
    broadcastAuctionParamsSchema,
    broadcastRecipientsQuerySchema,
    previewAuctionMessageSchema,
    sendAuctionMessageSchema,
} from "../validations/auctionBroadcast.validation.js";

const handleError = (res, error, label, fallback) => {
    if (error instanceof ZodError) {
        return res.status(400).json({ success: false, message: error.issues?.[0]?.message || "Validation failed" });
    }
    const status = error.statusCode || 500;
    if (status >= 500) console.error(`${label} error:`, error);
    return res.status(status).json({ success: false, message: status === 500 ? fallback : error.message });
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// -----------------------------------------------------------------
// GET /api/admin/auction-emails — auctions with their registered bidder counts
// -----------------------------------------------------------------

export const getBroadcastAuctions = async (req, res) => {
    try {
        const data = await listBroadcastAuctionsService();
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Auctions fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get auction email auctions", "Failed to fetch auctions");
    }
};

// -----------------------------------------------------------------
// GET /api/admin/auction-emails/:auctionUuid/recipients?search&status — registered bidders
// -----------------------------------------------------------------

export const getBroadcastRecipients = async (req, res) => {
    try {
        const { auctionUuid } = broadcastAuctionParamsSchema.parse(req.params);
        const query = broadcastRecipientsQuerySchema.parse(req.query);
        const data = await listBroadcastRecipientsService({ auctionUuid, ...query });
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Registered bidders fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get auction email recipients", "Failed to fetch the registered bidders");
    }
};

// -----------------------------------------------------------------
// POST /api/admin/auction-emails/:auctionUuid/preview { subject, heading?, message, greeting?, userUuids? }
// -----------------------------------------------------------------

export const previewAuctionMessage = async (req, res) => {
    try {
        const { auctionUuid } = broadcastAuctionParamsSchema.parse(req.params);
        const body = previewAuctionMessageSchema.parse(req.body ?? {});
        const data = await previewAuctionMessageService({ auctionUuid, ...body, actorId: req.user?.userId });
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Preview ready", data });
    } catch (error) {
        return handleError(res, error, "Preview auction email", "Failed to build the preview");
    }
};

// -----------------------------------------------------------------
// POST /api/admin/auction-emails/:auctionUuid/send { subject, heading?, message, greeting?, userUuids, test? }
// -----------------------------------------------------------------

export const sendAuctionMessage = async (req, res) => {
    try {
        const { auctionUuid } = broadcastAuctionParamsSchema.parse(req.params);
        const body = sendAuctionMessageSchema.parse(req.body ?? {});
        const data = await sendAuctionMessageService({ auctionUuid, ...body, actorId: req.user?.userId });

        let message;
        if (data.test) message = `Test email sent to ${data.sentTo}`;
        else if (!data.failed.length) message = `"${body.subject}" sent to ${plural(data.sent, "bidder")} of "${data.auction.title}"`;
        else message = `"${body.subject}" sent to ${plural(data.sent, "bidder")} of "${data.auction.title}" — ${data.failed.length} failed`;

        // every email failing is a server-side problem (e.g. Mailgun down), not a success
        const allFailed = !data.test && data.sent === 0 && data.failed.length > 0;
        return res.status(allFailed ? 502 : 200).json({ success: !allFailed, message: allFailed ? "No emails could be sent — try again shortly" : message, data });
    } catch (error) {
        return handleError(res, error, "Send auction email", "Failed to send the email");
    }
};
