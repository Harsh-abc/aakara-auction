import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"

import { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID } from "../../storefront"
import { isUpcomingLot } from "./lotPageDisplay"
import type { BidKind } from "./useBidAction"

export type OnBid = (kind: BidKind, lot: PublicLot) => void

// one button style across the storefront
export { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID }

// "Place a bid" only while the lot is on the block; proxy bids only before it opens
export function BidButtons({ lot, onBid, className }: { lot: PublicLot; onBid: OnBid; className?: string }) {
    const proxyOpen = isUpcomingLot(lot)
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <button type="button" onClick={() => onBid("bid", lot)} disabled={lot.status !== "ACTIVE"} className={cn(BUTTON, BUTTON_SOLID)}>
                Place a bid
            </button>
            <button
                type="button"
                onClick={() => onBid("proxy", lot)}
                disabled={!proxyOpen}
                title={proxyOpen ? undefined : "Proxy bids close when the lot opens"}
                className={cn(BUTTON, BUTTON_OUTLINE)}
            >
                Proxy bid
            </button>
        </div>
    )
}
