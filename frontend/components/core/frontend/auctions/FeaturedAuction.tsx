import Link from "next/link"

import { Skeleton } from "@/components/ui/skeleton"
import type { PublicAuction } from "@/lib/types/publicAuction.types"

import { AuctionCountdown } from "./AuctionCountdown"
import { auctionHref, countdownFor, isLive } from "./auctionDisplay"
import { StatusBadge } from "./StatusBadge"

const BANNER = "relative aspect-video w-full overflow-hidden bg-[#2A1424] sm:aspect-21/8"

// shown when the sale has no cover image, or there's no sale to feature yet
function BannerFallback({ title, kicker }: { title: string; kicker: string }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#5A2A4C_0%,#2A1424_70%)] px-6 text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#D9B45A] sm:text-xs">{kicker}</span>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-[#F5E6D3] uppercase sm:text-5xl lg:text-6xl">
                {title}
            </h2>
        </div>
    )
}

export function FeaturedAuctionSkeleton() {
    return (
        <section>
            <Skeleton className={`${BANNER} rounded-none`} />
            <div className="border border-t-0 border-neutral-200 p-5 md:p-6">
                <Skeleton className="h-4 w-24 rounded-none" />
                <Skeleton className="mt-4 h-8 w-64 rounded-none" />
                <Skeleton className="mt-3 h-4 w-full max-w-md rounded-none" />
            </div>
        </section>
    )
}

export function FeaturedAuction({ auction }: { auction: PublicAuction | null }) {
    if (!auction) {
        return (
            <section className={BANNER}>
                <BannerFallback kicker="Coming soon" title="New sales are being prepared" />
            </section>
        )
    }

    const live = isLive(auction)
    const countdown = countdownFor(auction)

    return (
        <section>
            <div className={BANNER}>
                {auction.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={auction.coverImageUrl} alt={auction.title} className="h-full w-full object-cover" />
                ) : (
                    <BannerFallback kicker={live ? "Live now" : "Coming soon"} title={auction.title} />
                )}
            </div>

            <div className="flex flex-col gap-6 border border-t-0 border-neutral-200 bg-white p-5 md:flex-row md:items-end md:justify-between md:p-6">
                <div className="min-w-0 max-w-xl">
                    <StatusBadge label={live ? "Live now" : "Coming soon"} tone={live ? "live" : "upcoming"} />
                    <h1 className="mt-3 text-3xl font-light text-neutral-950 md:text-4xl">{auction.title}</h1>
                    {auction.short_description && (
                        <p className="mt-3 text-sm leading-relaxed text-neutral-500">{auction.short_description}</p>
                    )}
                </div>

                <div className="flex shrink-0 flex-col gap-4 md:items-end">
                    {countdown && <AuctionCountdown label={countdown.label} target={countdown.target} />}
                    <Link
                        href={auctionHref(auction)}
                        className="inline-flex h-10 items-center justify-center bg-neutral-950 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800"
                    >
                        View the auction
                    </Link>
                </div>
            </div>
        </section>
    )
}
