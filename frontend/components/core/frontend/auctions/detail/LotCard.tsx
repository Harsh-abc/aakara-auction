import Link from "next/link"
import { ImageOff } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"

import { LotBadge } from "./LotBadge"
import { lotBidLine, lotDetails, lotEstimate, lotHeading, lotHref, lotNumber } from "./lotDisplay"

const VIEW_BUTTON =
    "inline-flex h-9 items-center justify-center bg-neutral-950 px-5 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800"

function LotImage({ lot, className }: { lot: PublicLot; className?: string }) {
    return (
        <div className={cn("flex items-center justify-center overflow-hidden bg-neutral-50", className)}>
            {lot.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lot.image} alt={lotHeading(lot)} className="h-full w-full object-contain" loading="lazy" />
            ) : (
                <ImageOff className="size-6 text-neutral-300" />
            )}
        </div>
    )
}

function LotText({ lot }: { lot: PublicLot }) {
    const details = lotDetails(lot)
    const estimate = lotEstimate(lot)

    return (
        <>
            <h3 className="text-sm text-neutral-950">{lotHeading(lot)}</h3>
            {details && <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-neutral-500">{details}</p>}
            <div className="mt-3 border-t border-neutral-200 pt-3">
                {estimate && (
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Estimate · {estimate}</p>
                )}
                <p className="mt-1 text-sm text-neutral-950">{lotBidLine(lot)}</p>
            </div>
        </>
    )
}

type LotProps = { lot: PublicLot; auctionUuid: string }

export function LotCard({ lot, auctionUuid }: LotProps) {
    return (
        <article className="flex flex-col border border-neutral-200 bg-white p-4">
            <LotImage lot={lot} className="aspect-square" />
            <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-950">{lotNumber(lot)}</span>
                <LotBadge lot={lot} />
            </div>
            <div className="mt-3 flex-1">
                <LotText lot={lot} />
            </div>
            <Link href={lotHref(auctionUuid, lot)} className={cn(VIEW_BUTTON, "mt-4 w-full")}>
                View
            </Link>
        </article>
    )
}

export function LotRow({ lot, auctionUuid }: LotProps) {
    return (
        <article className="grid grid-cols-[96px_1fr] gap-4 border-b border-neutral-200 py-5 sm:grid-cols-[120px_1fr_auto] sm:items-center sm:gap-6">
            <LotImage lot={lot} className="aspect-square" />
            <div className="min-w-0">
                <div className="mb-2 flex items-center gap-3">
                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-950">{lotNumber(lot)}</span>
                    <LotBadge lot={lot} />
                </div>
                <LotText lot={lot} />
            </div>
            <Link href={lotHref(auctionUuid, lot)} className={cn(VIEW_BUTTON, "col-span-2 sm:col-span-1")}>
                View
            </Link>
        </article>
    )
}
