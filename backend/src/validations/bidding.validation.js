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
