import Link from "next/link"
import { ImageOff } from "lucide-react"

import type { PublicAuction } from "@/lib/types/publicAuction.types"

import { AuctionCountdown } from "./AuctionCountdown"
import {
    auctionHref,
    auctionMeta,
    badgeTone,
    countdownFor,
    STOREFRONT_STATUS_LABELS,
    type BidderEligibility,
} from "./auctionDisplay"
import { RegisterToBidButton } from "./RegisterToBidButton"
import { StatusBadge } from "./StatusBadge"

type AuctionListItemProps = {
    auction: PublicAuction
    paddleNumber?: string
    eligibility: BidderEligibility
    onRegistered: (auctionUuid: string, paddleNumber: string) => void
}

export function AuctionListItem({ auction, paddleNumber, eligibility, onRegistered }: AuctionListItemProps) {
    const countdown = countdownFor(auction)
    const isPast = !countdown

    return (
        <article
            className="grid grid-cols-1 gap-6 border-b border-neutral-200 py-8 last:border-b-0 sm:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr_260px] lg:items-center lg:gap-10"
        >
            <div className="flex aspect-4/5 w-full max-w-50 items-center justify-center overflow-hidden bg-neutral-100 sm:max-w-none">
                {auction.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={auction.coverImageUrl} alt={auction.title} className="h-full w-full object-cover" />
                ) : (
                    <ImageOff className="size-6 text-neutral-300" />
                )}
            </div>

            <div className="min-w-0">
                <StatusBadge label={STOREFRONT_STATUS_LABELS[auction.status] ?? auction.status} tone={badgeTone(auction)} />
                <h3 className="mt-3 text-lg font-normal text-neutral-950">{auction.title}</h3>
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">{auctionMeta(auction)}</p>
                {auction.short_description && (
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600">{auction.short_description}</p>
                )}
            </div>

            <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
                {countdown && <AuctionCountdown label={countdown.label} target={countdown.target} className="lg:justify-end" />}
                {!isPast && (
                    <RegisterToBidButton
                        auction={auction}
                        paddleNumber={paddleNumber}
                        eligibility={eligibility}
                        onRegistered={onRegistered}
                    />
                )}
                <Link
                    href={auctionHref(auction)}
                    className="inline-flex h-11 w-full items-center justify-center border border-neutral-950 bg-white px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition-colors hover:bg-neutral-50"
                >
                    {isPast ? "View results" : "Browse"}
                </Link>
            </div>
        </article>
    )
}
