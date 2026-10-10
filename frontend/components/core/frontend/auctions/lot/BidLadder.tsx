import { cn } from "@/lib/utils"
import type { PublicLotDetail } from "@/lib/types/publicAuction.types"

import { formatMoney, lotBidLine } from "../detail/lotDisplay"
import { bidCountLabel, isClosedLot, isUpcomingLot, lotTag } from "./lotPageDisplay"

const SMALL_CAPS = "text-[11px] leading-[13.2px] tracking-[0.16em] uppercase"

// the top bid's label: still leading while the lot is open, the result once it closes
const topBidLabel = (lot: PublicLotDetail) => (lot.status === "SOLD" ? "Sold" : isClosedLot(lot) ? "Highest" : "Leading")

export function BidLadder({ lot, className }: { lot: PublicLotDetail; className?: string }) {
    const count = Number(lot.bidCount) || 0
    const closed = isClosedLot(lot)
    const money = (amount: string | null) => formatMoney(amount, lot.currency) ?? "—"

    return (
        <section className={className} aria-label="Bid ladder">
            <div className="flex items-baseline justify-between gap-4 border-b border-[#cecece] pb-3">
                <h2 className="flex items-baseline gap-2.75">
                    <span className="text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">Bid ladder</span>
                    <span className="text-[10px] leading-3.75 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">
                        {lotTag(lot)}
                    </span>
                </h2>
                <span className={cn(SMALL_CAPS, "text-[#717171]")}>{bidCountLabel(count)} so far</span>
            </div>

            <div className="mt-6 border border-[#cecece] bg-white">
                <div className="flex h-16.5 items-center border-b border-dashed border-[#333]">
                    <span className={cn(SMALL_CAPS, "w-15 shrink-0 pl-4 text-[#717171]")} aria-hidden>
                        ▲
                    </span>
                    <div>
                        <p className={cn(SMALL_CAPS, "text-[#717171]")}>{closed ? "Bidding closed" : "Next valid bid"}</p>
                        <p className="mt-0.75 text-[18px] leading-7 font-medium text-[#0d0d0d]">
                            {closed ? lotBidLine(lot) : money(lot.nextBid)}
                        </p>
                    </div>
                </div>

                <ol className="divide-y divide-[#cecece]">
                    {lot.bids.length === 0 ? (
                        <li className="flex h-11 items-center px-4 text-[14px] leading-5 text-[#717171]">No bids yet</li>
                    ) : (
                        lot.bids.map((bid, index) => {
                            const top = index === 0
                            return (
                                <li
                                    key={bid.uuid}
                                    className={cn(
                                        "flex items-center pr-4",
                                        top ? "h-13.25 bg-[#0d0d0d] text-white" : "h-11 text-[#717171]"
                                    )}
                                >
                                    <span className={cn(SMALL_CAPS, "w-15 shrink-0 pl-4")}>{count - index}</span>
                                    <span className={cn("flex-1", top ? "text-[18px] leading-7 font-medium" : "text-[14px] leading-5")}>
                                        {money(bid.amount)}
                                        {bid.source === "PROXY" && (
                                            <span className={cn(SMALL_CAPS, "ml-3 text-[10px]", top ? "text-white/60" : "text-[#717171]")}>
                                                Proxy
                                            </span>
                                        )}
                                    </span>
                                    <span className={SMALL_CAPS}>{top ? topBidLabel(lot) : "Outbid"}</span>
                                </li>
                            )
                        })
                    )}
                </ol>

                <div className={cn(SMALL_CAPS, "flex h-8.5 items-center justify-between border-t border-[#cecece] px-4 text-[#717171]")}>
                    <span>{count > 0 || !isUpcomingLot(lot) ? "Opened at" : "Opens at"}</span>
                    <span>{money(lot.startingPrice)}</span>
                </div>
            </div>
        </section>
    )
}
