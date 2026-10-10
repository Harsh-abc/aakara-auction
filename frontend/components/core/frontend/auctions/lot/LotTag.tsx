import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"

import { closedLabel, isUpcomingLot } from "./lotPageDisplay"

type TagTone = "live" | "sold" | "bidding" | "upcoming" | "up-next" | "closed"

const BASE = "inline-flex h-5 shrink-0 items-center justify-center gap-1 px-1.5 text-[10px] leading-3.75 uppercase tracking-[0.14em]"

const TONES: Record<TagTone, string> = {
    live: "bg-black text-white",
    sold: "bg-black text-white",
    bidding: "bg-[#f1d3ac] text-[9.2px] tracking-[0.1em] text-black",
    upcoming: "border border-[#cea25a] text-[#0d0d0d]",
    "up-next": "border border-[#d0a55d] text-black",
    closed: "border border-[#cecece] text-[#717171]",
}

// small square tags — gold dot while live, red once sold
export function Tag({ tone, label, className }: { tone: TagTone; label: string; className?: string }) {
    return (
        <span className={cn(BASE, TONES[tone], className)}>
            {tone === "live" && <span className="size-1 shrink-0 rounded-full bg-[#d0a55d]" />}
            {tone === "sold" && <span className="size-1 shrink-0 rounded-full bg-[#e42a00]" />}
            {tone === "bidding" && "★ "}
            {label}
        </span>
    )
}

// a lot's tag in tables and the lot header
export function LotStatusTag({ lot, className }: { lot: PublicLot; className?: string }) {
    if (lot.status === "ACTIVE") {
        return Number(lot.bidCount) > 0 ? (
            <Tag tone="bidding" label="Bidding" className={className} />
        ) : (
            <Tag tone="live" label="Live" className={className} />
        )
    }
    if (lot.status === "SOLD") return <Tag tone="sold" label="Sold" className={className} />
    if (isUpcomingLot(lot)) return <Tag tone="upcoming" label="Upcoming" className={className} />

    const label = closedLabel(lot)
    return label ? <Tag tone="closed" label={label} className={className} /> : null
}
