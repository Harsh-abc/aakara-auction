"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { PublicAuction } from "@/lib/types/publicAuction.types";
import { getFeaturedAuction } from "@/services/operations/publicAuction.api";
import homeBanner from "@/public/logo/home-banner.jpg";

import { AuctionCountdown } from "../auctions/AuctionCountdown";
import { auctionHref, countdownFor, isLive } from "../auctions/auctionDisplay";
import { StatusBadge } from "../auctions/StatusBadge";

// banner frame: same aspect ratios as the reference design (16/9 mobile, 8/3 from sm up)
const BANNER_FRAME = "relative block aspect-[16/9] w-full overflow-hidden sm:aspect-[8/3]";
const BANNER_WRAP = "overflow-hidden border-b border-[#cecece] bg-black";

const CARD_BODY = "flex flex-1 flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:gap-10";

const BROWSE_ALL =
    "inline-flex h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-none border border-black bg-black px-6 text-[12px] uppercase tracking-[0.12em] text-white transition-[background-color,border-color,color,transform] duration-200 ease-out hover:border-[#673364] hover:bg-[#673364]";

const TITLE = "mt-4 text-[2.25rem] font-medium leading-none tracking-[-0.025em] text-[#0d0d0d] sm:text-5xl";
const DESC = "mt-4 text-sm leading-relaxed text-[#717171]";

// the sale's own cover when it has one, otherwise the house "coming soon" banner
function HeroBanner({ auction }: { auction: PublicAuction | null }) {
    const image = auction?.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={auction.coverImageUrl} alt={auction.title} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" sizes="(min-width: 75rem) 75rem, 100vw" />
    ) : (
        <Image
            src={homeBanner}
            alt="Akara — Inaugural Fine Art Auction, coming soon"
            fill
            preload
            fetchPriority="high"
            placeholder="blur"
            sizes="(min-width: 75rem) 75rem, 100vw"
            className="object-cover transition-[opacity,transform] duration-700 ease-out"
        />
    );

    return (
        <div className={BANNER_WRAP}>
            {auction ? (
                <Link href={auctionHref(auction)} className={BANNER_FRAME}>
                    {image}
                </Link>
            ) : (
                <div className={BANNER_FRAME}>{image}</div>
            )}
        </div>
    );
}

function HomeHeroSkeleton() {
    return (
        <article className="flex h-full flex-col bg-white">
            <div className={BANNER_WRAP}>
                <Skeleton className={`${BANNER_FRAME} rounded-none`} />
            </div>
            <div className={CARD_BODY}>
                <div className="w-full max-w-xl">
                    <Skeleton className="h-5.5 w-24 rounded-none" />
                    <Skeleton className="mt-4 h-10 w-64 rounded-none sm:h-12" />
                    <Skeleton className="mt-4 h-4 w-full max-w-md rounded-none" />
                </div>
                <Skeleton className="h-11 w-44 rounded-none" />
            </div>
        </article>
    );
}

// the one sale that's live now, otherwise the next to open
function HomeHero({ auction }: { auction: PublicAuction | null }) {
    if (!auction) {
        return (
            <article className="flex h-full flex-col bg-white">
                <HeroBanner auction={null} />
                <div className={CARD_BODY}>
                    <div className="max-w-xl">
                        <StatusBadge label="Coming soon" tone="upcoming" />
                        <h2 className={TITLE}>New sales are being prepared</h2>
                        <p className={DESC}>Our next catalogue is in the making. Browse past sales in the meantime.</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
                        <Link href="/auctions" className={BROWSE_ALL}>
                            Browse all auctions
                        </Link>
                    </div>
                </div>
            </article>
        );
    }

    const live = isLive(auction);
    const countdown = countdownFor(auction);

    return (
        <article className="flex h-full flex-col bg-white">
            <HeroBanner auction={auction} />

            <div className={CARD_BODY}>
                <div className="max-w-xl">
                    <StatusBadge label={live ? "Live now" : "Coming soon"} tone={live ? "live" : "upcoming"} />
                    <h2 className={TITLE}>
                        <Link href={auctionHref(auction)}>{auction.title}</Link>
                    </h2>
                    {auction.short_description && <p className={DESC}>{auction.short_description}</p>}
                </div>

                <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
                    {countdown && <AuctionCountdown label={countdown.label} target={countdown.target} />}
                    <Link href="/auctions" className={BROWSE_ALL}>
                        Browse all auctions
                    </Link>
                </div>
            </div>
        </article>
    );
}

export function HomePage() {
    const [auction, setAuction] = useState<PublicAuction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getFeaturedAuction()
            .then(setAuction)
            // fall back to the house banner rather than an error on the front door
            .catch(() => setAuction(null))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main id="main-content">
            <div className="page-container flex flex-1 flex-col mx-auto w-full px-6 pb-24 pt-12">
                <h1 className="sr-only">Akara Art — modern and contemporary South Asian art auctions</h1>
                <div className="border border-[#cecece]">{loading ? <HomeHeroSkeleton /> : <HomeHero auction={auction} />}</div>
            </div>
        </main>
    );
}
