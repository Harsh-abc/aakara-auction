import { cn } from "@/lib/utils"
import type { PublicLotDetail } from "@/lib/types/publicAuction.types"

import { AuctionCountdown } from "../AuctionCountdown"
import { formatMoney, lotEstimate } from "../detail/lotDisplay"
import { BidButtons, type OnBid } from "./BidButtons"
import { lotCountdown } from "./lotCatalogue"
import { bidCountLabel } from "./lotPageDisplay"

const SMALL_CAPS = "text-[11px] leading-[13.2px] tracking-[0.16em] uppercase"

// the right-hand column of the lot page: who, what, how much, and the bid buttons
export function LotPricePanel({
    lot,
    onBid,
    bidRefreshKey,
    bidHref,
    className,
}: {
    lot: PublicLotDetail
    onBid: OnBid
    /** changes after a bid is saved — see BidButtons */
    bidRefreshKey?: number
    /** where "Place bid" goes instead of the bid dialog — see BidButtons */
    bidHref?: string
    className?: string
}) {
    const count = Number(lot.bidCount) || 0
    const countdown = lotCountdown(lot)
    // a sold lot shows its price including the buyer's premium
    const winner = lot.status === "SOLD" ? lot.winner : null

    const rows = [
        { term: "Estimate", value: lotEstimate(lot) },
        { term: "Starting bid", value: formatMoney(lot.startingPrice, lot.currency) },
        {
            term: `${lot.status === "SOLD" ? "Hammer price" : "Current bid"} · ${bidCountLabel(count)}`,
            value: winner
                ? `${formatMoney(winner.totalPrice, lot.currency)}*`
                : count > 0
                  ? formatMoney(lot.currentBid, lot.currency)
                  : "—",
            note: winner ? "*Price including buyer's premium" : undefined,
        },
    ].filter((row): row is { term: string; value: string; note?: string } => !!row.value)

    return (
        <aside className={className}>
            <h2 className="text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">{lot.artistName ?? lot.title}</h2>
            {lot.yearCreated && <p className="mt-1 text-[14px] leading-5 text-[#717171] italic">{lot.yearCreated}</p>}
            {lot.artworkType && <p className={cn(SMALL_CAPS, "mt-1.75 text-[#717171]")}>{lot.artworkType}</p>}

            <dl className="mt-5 border-b border-[#cecece] bg-white">
                {rows.map(({ term, value, note }, index) => (
                    <div
                        key={term}
                        className={cn(
                            "flex min-h-13.25 items-center justify-between gap-4 px-4",
                            note && "py-2.5",
                            index < rows.length - 1 && "border-b border-[#cecece]"
                        )}
                    >
                        <dt className={cn(SMALL_CAPS, "text-[#717171]")}>{term}</dt>
                        <dd className="text-right text-[14px] leading-5 font-medium text-[#0d0d0d]">
                            {value}
                            {note && <span className="mt-0.5 block text-[11px] leading-4 font-normal text-[#717171] italic">{note}</span>}
                        </dd>
                    </div>
                ))}
            </dl>

            <div className="mt-6 flex flex-col items-center gap-2 py-3.5">
                {countdown ? (
                    <AuctionCountdown label={countdown.label} target={countdown.target} />
                ) : (
                    <>
                        <span className={cn(SMALL_CAPS, "text-[#717171]")}>Bidding closed</span>
                        {winner?.paddle && (
                            <p className="text-[20px] leading-7 font-medium text-[#0d0d0d]">Winner : Paddle {winner.paddle}</p>
                        )}
                    </>
                )}
            </div>

            <BidButtons lot={lot} onBid={onBid} refreshKey={bidRefreshKey} bidHref={bidHref} className="mt-6" />
        </aside>
    )
}
