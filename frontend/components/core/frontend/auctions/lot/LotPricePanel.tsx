import { cn } from "@/lib/utils"
import type { PublicLotDetail } from "@/lib/types/publicAuction.types"

import { AuctionCountdown } from "../AuctionCountdown"
import { formatMoney, lotEstimate } from "../detail/lotDisplay"
import { BidButtons } from "./BidButtons"
import { lotCountdown } from "./lotCatalogue"
import { bidCountLabel } from "./lotPageDisplay"
import type { BidKind } from "./useBidAction"

const SMALL_CAPS = "text-[11px] leading-[13.2px] tracking-[0.16em] uppercase"

// the right-hand column of the lot page: who, what, how much, and the bid buttons
export function LotPricePanel({ lot, onBid, className }: { lot: PublicLotDetail; onBid: (kind: BidKind) => void; className?: string }) {
    const count = Number(lot.bidCount) || 0
    const countdown = lotCountdown(lot)

    const rows = [
        { term: "Estimate", value: lotEstimate(lot) },
        { term: "Starting bid", value: formatMoney(lot.startingPrice, lot.currency) },
        {
            term: `${lot.status === "SOLD" ? "Hammer price" : "Current bid"} · ${bidCountLabel(count)}`,
            value: count > 0 ? formatMoney(lot.currentBid, lot.currency) : "—",
        },
    ].filter((row): row is { term: string; value: string } => !!row.value)

    return (
        <aside className={className}>
            <h2 className="text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">{lot.artistName ?? lot.title}</h2>
            <p className="mt-1 text-[14px] leading-5 text-[#717171] italic">
                {[lot.artistName ? lot.title : null, lot.yearCreated].filter(Boolean).join(", ")}
            </p>
            {lot.artworkType && <p className={cn(SMALL_CAPS, "mt-1.75 text-[#717171]")}>{lot.artworkType}</p>}

            <dl className="mt-5 border-b border-[#cecece] bg-white">
                {rows.map(({ term, value }, index) => (
                    <div
                        key={term}
                        className={cn("flex min-h-13.25 items-center justify-between gap-4 px-4", index < rows.length - 1 && "border-b border-[#cecece]")}
                    >
                        <dt className={cn(SMALL_CAPS, "text-[#717171]")}>{term}</dt>
                        <dd className="text-right text-[14px] leading-5 font-medium text-[#0d0d0d]">{value}</dd>
                    </div>
                ))}
            </dl>

            <div className="mt-6 flex justify-center py-3.5">
                {countdown ? (
                    <AuctionCountdown label={countdown.label} target={countdown.target} />
                ) : (
                    <span className={cn(SMALL_CAPS, "text-[#717171]")}>Bidding closed</span>
                )}
            </div>

            <BidButtons lot={lot} onBid={onBid} className="mt-5.5" />
        </aside>
    )
}
