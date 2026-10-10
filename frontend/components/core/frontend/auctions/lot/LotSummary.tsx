import Link from "next/link"

import { cn } from "@/lib/utils"
import type { PublicLotDetail } from "@/lib/types/publicAuction.types"

import { formatMoney, lotDetailsHref, lotDimensions, lotEstimate } from "../detail/lotDisplay"
import { BidButtons, BUTTON, BUTTON_OUTLINE } from "./BidButtons"
import { LotStatusTag, Tag } from "./LotTag"
import { bidCountLabel, lotTag } from "./lotPageDisplay"
import type { BidKind } from "./useBidAction"

const SMALL_CAPS = "text-[11px] leading-[13.2px] tracking-[0.16em] uppercase"

// "Current bid · 2 bids" / "Starting bid" / "Hammer price"
function bidHeading(lot: PublicLotDetail, count: number) {
    if (count === 0) return "Starting bid"
    return `${lot.status === "SOLD" ? "Hammer price" : "Current bid"} · ${bidCountLabel(count)}`
}

type LotSummaryProps = {
    auctionUuid: string
    lot: PublicLotDetail
    onBid: (kind: BidKind) => void
    className?: string
}

// artist, title, catalogue facts and the bid buttons, beside the lot image
export function LotSummary({ auctionUuid, lot, onBid, className }: LotSummaryProps) {
    const count = Number(lot.bidCount) || 0
    const amount = formatMoney(count > 0 ? lot.currentBid : lot.startingPrice, lot.currency) ?? "—"
    const leader = count > 0 ? (lot.leadingPaddle ? `Paddle ${lot.leadingPaddle}` : "Another bidder") : null

    const facts = [
        { term: "Medium", value: lot.medium },
        { term: "Year", value: lot.yearCreated },
        { term: "Dimensions", value: lotDimensions(lot) },
        { term: "Estimate", value: lotEstimate(lot) },
    ].filter((fact): fact is { term: string; value: string } => !!fact.value)

    return (
        <div className={className}>
            <div className="flex items-center gap-3">
                <span className="text-[10px] leading-3.75 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">{lotTag(lot)}</span>
                {lot.status === "ACTIVE" ? <Tag tone="live" label="Live" /> : <LotStatusTag lot={lot} />}
            </div>

            <h2 className="mt-3.75 text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">
                {lot.artistName ?? lot.title}
            </h2>
            {lot.artistName && <p className="mt-1.75 text-[18px] leading-7 text-[#0d0d0d]">{lot.title}</p>}

            {facts.length > 0 && (
                <dl className="mt-6 divide-y divide-[#cecece] border-y border-[#cecece]">
                    {facts.map(({ term, value }) => (
                        <div key={term} className="flex min-h-9.25 items-center justify-between gap-4 py-2">
                            <dt className={cn(SMALL_CAPS, "text-[#717171]")}>{term}</dt>
                            <dd className="text-right text-[14px] leading-5 text-[#0d0d0d]">{value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                    <p className={cn(SMALL_CAPS, "text-[#717171]")}>{bidHeading(lot, count)}</p>
                    <p className="mt-px text-[30px] leading-9 font-medium text-[#0d0d0d]">{amount}</p>
                </div>
                {leader && (
                    <div className="text-right">
                        <p className={cn(SMALL_CAPS, "text-[#717171]")}>{lot.status === "SOLD" ? "Buyer" : "Leading"}</p>
                        <p className="mt-0.75 text-[14px] leading-5 text-[#0d0d0d]">{leader}</p>
                    </div>
                )}
            </div>

            <BidButtons lot={lot} onBid={onBid} className="mt-5" />
            <Link href={lotDetailsHref(auctionUuid, lot)} className={cn(BUTTON, BUTTON_OUTLINE, "mt-3")}>
                View full lot
            </Link>
        </div>
    )
}
