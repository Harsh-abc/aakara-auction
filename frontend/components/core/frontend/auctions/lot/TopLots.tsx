import Link from "next/link"

import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"

import { formatMoney, lotEstimate, lotHeading, lotHref } from "../detail/lotDisplay"
import { LotStatusTag } from "./LotTag"
import { isUpcomingLot, lotTag } from "./lotPageDisplay"
import type { BidKind } from "./useBidAction"

const SMALL_CAPS = "text-[11px] leading-[13.2px] tracking-[0.16em] uppercase"
const ROW_GRID = "md:grid md:grid-cols-[96px_minmax(0,1fr)_156px_136px_240px] md:items-center md:px-5"
const ROW_BUTTON =
    "inline-flex h-9 cursor-pointer items-center justify-center border border-[#333] px-4 text-[12px] leading-4.5 tracking-[0.12em] uppercase transition-colors"

const SHOWN = 10

type TopLotsProps = {
    auctionUuid: string
    lots: PublicLot[]
    /** "live", "upcoming"… — the sale's state, lowercased in the heading */
    saleStatus: string
    onBid: (kind: BidKind) => void
    className?: string
}

export function TopLots({ auctionUuid, lots, saleStatus, onBid, className }: TopLotsProps) {
    const top = [...lots]
        .sort((a, b) => lotValue(b) - lotValue(a))
        .slice(0, SHOWN)

    return (
        <section className={className}>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-[#cecece] pb-3.25">
                <h2 className="text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">Top lots by value</h2>
                <span className={cn(SMALL_CAPS, "text-[#717171]")}>
                    {lots.length} {lots.length === 1 ? "lot" : "lots"} · {top.length} shown · {saleStatus}
                </span>
            </div>

            <div className="mt-6 border border-[#cecece]">
                <div className={cn(ROW_GRID, "hidden h-9.5 border-b border-[#cecece] text-[#717171]", SMALL_CAPS)}>
                    <span>Lot</span>
                    <span>Artist · Work title</span>
                    <span>Current bid</span>
                    <span>Status</span>
                    <span aria-hidden />
                </div>

                <ul className="divide-y divide-[#cecece]">
                    {top.map((lot) => {
                        const estimate = lotEstimate(lot)
                        const bid = Number(lot.bidCount) > 0 ? formatMoney(lot.currentBid, lot.currency) : null
                        const action = lot.status === "ACTIVE" ? "bid" : isUpcomingLot(lot) ? "proxy" : null

                        return (
                            <li key={lot.uuid} className={cn(ROW_GRID, "flex flex-col gap-3 p-4 md:min-h-17.5 md:gap-0 md:py-3")}>
                                <span className="text-[10px] leading-3.75 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">
                                    {lotTag(lot)}
                                </span>
                                <div className="min-w-0 md:pr-6">
                                    <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{lotHeading(lot)}</p>
                                    {estimate && <p className={cn(SMALL_CAPS, "mt-1.5 text-[#717171]")}>Estimate · {estimate}</p>}
                                </div>
                                <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{bid ?? "—"}</p>
                                <div>
                                    <LotStatusTag lot={lot} />
                                </div>
                                <div className="flex gap-2">
                                    {action && (
                                        <button
                                            type="button"
                                            onClick={() => onBid(action)}
                                            className={cn(ROW_BUTTON, "w-27.5 bg-[#0d0d0d] px-0 text-white hover:bg-neutral-800")}
                                        >
                                            {action === "bid" ? "Place a bid" : "Proxy bid"}
                                        </button>
                                    )}
                                    <Link href={lotHref(auctionUuid, lot)} className={cn(ROW_BUTTON, "w-17.5 px-0 text-[#0d0d0d] hover:bg-[#f5f5f5]")}>
                                        View
                                    </Link>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </section>
    )
}

// what a lot is worth for ranking: its current bid, else its estimate
function lotValue(lot: PublicLot) {
    const bid = Number(lot.bidCount) > 0 ? lot.currentBid : null
    return Number(bid ?? lot.estimateHigh ?? lot.estimateLow ?? lot.startingPrice) || 0
}
