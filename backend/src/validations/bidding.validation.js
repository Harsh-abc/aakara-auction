import { z } from "zod";

// auction_items money columns are Decimal(12, 2)
const MAX_AMOUNT = 9_999_999_999.99;

const money = (label) =>
    z.coerce
        .number({ message: `${label} must be a number` })
        .positive(`${label} must be more than zero`)
        .max(MAX_AMOUNT, `${label} is too large`)
        .refine((value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6, `${label} can have at most 2 decimal places`)
        .transform((value) => Math.round(value * 100) / 100);

export const placeBidSchema = z.object({
    amount: money("Bid"),
});

export const setProxyBidSchema = z.object({
    maxAmount: money("Maximum bid"),
});

// dashboard: proxy bids — filters shared by the list, the summary and the CSV export
const optionalText = (max) => z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(max).optional());
const optionalUuid = (label) => z.preprocess((v) => (v === "" ? undefined : v), z.uuid({ message: `Invalid ${label} id` }).optional());

export const proxyBidFiltersSchema = z.object({
    search: optionalText(200),
    auctionUuid: optionalUuid("auction"),
    stage: z.preprocess((v) => (v === "" || v === "all" ? undefined : v), z.enum(["waiting", "live", "closed", "withdrawn"]).optional()),
    ip: optionalText(64),
    userUuid: optionalUuid("user"),
});

export const getProxyBidsQuerySchema = proxyBidFiltersSchema.extend({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const proxyBidSummaryQuerySchema = z.object({ auctionUuid: optionalUuid("auction") });

// console: a bid the auctioneer enters for a paddle in the room ("#1042" or "1042")
export const placeFloorBidSchema = z.object({
    paddleNumber: z.coerce
        .string()
        .trim()
        .transform((value) => value.replace(/^#/, ""))
        .pipe(z.string().min(1, "Enter the bidder's paddle number").max(20, "Paddle number is too long")),
    amount: money("Bid"),
});
