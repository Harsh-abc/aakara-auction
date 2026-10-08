import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"

import { LOT_BADGES } from "./lotDisplay"

// "• LIVE" in solid black while the lot is open; outlined once it has closed
export function LotBadge({ lot }: { lot: PublicLot }) {
    const badge = LOT_BADGES[lot.status]
    if (!badge) return null

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em]",
                badge.live ? "bg-neutral-950 text-white" : "border border-neutral-300 text-neutral-500"
            )}
        >
            {badge.live && <span className="size-1 animate-pulse rounded-full bg-white" />}
            {badge.label}
        </span>
    )
}
