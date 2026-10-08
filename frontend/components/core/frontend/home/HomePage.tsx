"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { PublicAuction } from "@/lib/types/publicAuction.types"
import { getFeaturedAuction } from "@/services/operations/publicAuction.api"
import homeBanner from "@/public/logo/home-banner.jpg"

import { AuctionCountdown } from "../auctions/AuctionCountdown"
import { auctionHref, countdownFor, isLive } from "../auctions/auctionDisplay"
import { StatusBadge } from "../auctions/StatusBadge"

// matches the house banner's proportions so its lettering is never cropped
const BANNER = "relative block aspect-1584/870 w-full overflow-hidden bg-[#1A0F18]"

const BROWSE_ALL =
    "inline-flex h-10 items-center justify-center bg-neutral-950 px-6 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800"

// the sale's own cover when it has one, otherwise the house "coming soon" banner
function HeroBanner({ auction }: { auction: PublicAuction | null }) {
    const image = auction?.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={auction.coverImageUrl} alt={auction.title} className="h-full w-full object-cover" />
    ) : (
        <Image
            src={homeBanner}
            alt="Akara — Inaugural Fine Art Auction, coming soon"
            fill
            preload
            placeholder="blur"
            sizes="(min-width: 72rem) 72rem, 100vw"
            className="object-cover"
        />
    )

    if (!auction) return <div className={BANNER}>{image}</div>
    return (
        <Link href={auctionHref(auction)} className={BANNER}>
            {image}
        </Link>
    )
}

function HomeHeroSkeleton() {
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

// the one sale that's live now, otherwise the next to open
function HomeHero({ auction }: { auction: PublicAuction | null }) {
    if (!auction) {
        return (
            <section>
                <HeroBanner auction={null} />
                <div className="flex flex-col gap-6 border border-t-0 border-neutral-200 bg-white p-5 md:flex-row md:items-end md:justify-between md:p-6">
                    <div className="min-w-0 max-w-xl">
                        <StatusBadge label="Coming soon" tone="upcoming" />
                        <h1 className="mt-3 text-3xl font-light text-neutral-950 md:text-4xl">New sales are being prepared</h1>
                        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                            Our next catalogue is in the making. Browse past sales in the meantime.
                        </p>
                    </div>
                    <Link href="/auctions" className={`${BROWSE_ALL} shrink-0`}>
                        Browse all auctions
                    </Link>
                </div>
            </section>
        )
    }

    const live = isLive(auction)
    const countdown = countdownFor(auction)

    return (
        <section>
            <HeroBanner auction={auction} />

            <div className="flex flex-col gap-6 border border-t-0 border-neutral-200 bg-white p-5 md:flex-row md:items-end md:justify-between md:p-6">
                <div className="min-w-0 max-w-xl">
                    <StatusBadge label={live ? "Live now" : "Coming soon"} tone={live ? "live" : "upcoming"} />
                    <h1 className="mt-3 text-3xl font-light text-neutral-950 md:text-4xl">
                        <Link href={auctionHref(auction)} className="hover:underline hover:underline-offset-4">
                            {auction.title}
                        </Link>
                    </h1>
                    {auction.short_description && (
                        <p className="mt-3 text-sm leading-relaxed text-neutral-500">{auction.short_description}</p>
                    )}
                </div>

                <div className="flex shrink-0 flex-col gap-4 md:items-end">
                    {countdown && <AuctionCountdown label={countdown.label} target={countdown.target} />}
                    <Link href="/auctions" className={BROWSE_ALL}>
                        Browse all auctions
                    </Link>
                </div>
            </div>
        </section>
    )
}

export function HomePage() {
    const [auction, setAuction] = useState<PublicAuction | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getFeaturedAuction()
            .then(setAuction)
            // fall back to the house banner rather than an error on the front door
            .catch(() => setAuction(null))
            .finally(() => setLoading(false))
    }, [])

    return (
        <main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6 md:px-6 md:py-8">
            {loading ? <HomeHeroSkeleton /> : <HomeHero auction={auction} />}
        </main>
    )
}
