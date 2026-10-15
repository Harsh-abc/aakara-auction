import type { AuctionConsole, BidderRef } from "@/lib/types/bidding.types";
import type { BidSource } from "@/lib/types/publicAuction.types";
import { formatMoney } from "@/lib/types/LotRow";

/** Money columns arrive as strings */
export const money = (amount: string | number | null | undefined, code: string) =>
    amount === null || amount === undefined || amount === "" ? "—" : formatMoney(Number(amount), code);

/** "₹50K", "₹1L" — for increment hints */
export const compactMoney = (amount: number, code: string) => {
    try {
        return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
            style: "currency",
            currency: code,
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(amount);
    } catch {
        return `${code} ${amount}`;
    }
};

export const paddleLabel = (bidder: Pick<BidderRef, "paddle" | "name"> | null | undefined) =>
    bidder?.paddle ? `Paddle #${bidder.paddle}` : bidder?.name ?? "Unknown bidder";

/** How a bid reached the floor — the console says ONLINE for bids placed on the site */
export const SOURCE_BADGES: Record<BidSource, { label: string; className: string }> = {
    FLOOR: { label: "Floor", className: "bg-[#FFF3D6] text-[#B7791F]" },
    MANUAL: { label: "Online", className: "bg-[#E4F7F0] text-[#00865A]" },
    PROXY: { label: "Proxy", className: "bg-violet-50 text-[#7b365d]" },
};

export const sourceBadge = (source: BidSource) => SOURCE_BADGES[source] ?? SOURCE_BADGES.MANUAL;

/** Buyer's premium on a hammer price — mirrors recordWinner in backend/src/services/liveAuction.services.js */
export const buyerPremiumOn = (hammer: number, fees: AuctionConsole["buyerPremium"]) =>
    Math.round(
        fees.reduce(
            (sum, fee) => sum + (fee.calculationType === "PERCENTAGE" ? (hammer * Number(fee.value)) / 100 : Number(fee.value)),
            0
        ) * 100
    ) / 100;
