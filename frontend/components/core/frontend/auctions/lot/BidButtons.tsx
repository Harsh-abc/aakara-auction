import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"

import { isUpcomingLot } from "./lotPageDisplay"
import type { BidKind } from "./useBidAction"

export const BUTTON =
    "inline-flex h-11 w-full cursor-pointer items-center justify-center border text-[12px] leading-4.5 tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
export const BUTTON_SOLID = "border-black bg-black text-white hover:bg-neutral-800"
export const BUTTON_OUTLINE = "border-[#333] bg-white text-[#0d0d0d] hover:bg-[#f5f5f5]"

// "Place a bid" only while the lot is on the block; proxy bids until it closes
export function BidButtons({ lot, onBid, className }: { lot: PublicLot; onBid: (kind: BidKind) => void; className?: string }) {
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <button type="button" onClick={() => onBid("bid")} disabled={lot.status !== "ACTIVE"} className={cn(BUTTON, BUTTON_SOLID)}>
                Place a bid
            </button>
            <button
                type="button"
                onClick={() => onBid("proxy")}
                disabled={!(lot.status === "ACTIVE" || isUpcomingLot(lot))}
                className={cn(BUTTON, BUTTON_OUTLINE)}
            >
                Proxy bid
            </button>
        </div>
    )
}
