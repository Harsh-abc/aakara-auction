import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import type { PublicAuction } from "@/lib/types/publicAuction.types";

import { AuctionCountdown } from "./AuctionCountdown";
import { auctionHref, countdownFor, isLive } from "./auctionDisplay";
import { StatusBadge } from "./StatusBadge";

// layout + styles from the home page design
const CARD = "border border-[#cecece] bg-white";
const BANNER_WRAP = "overflow-hidden border-b border-[#cecece] bg-black";
const BANNER_FRAME = "relative block aspect-[16/9] w-full overflow-hidden sm:aspect-[8/3]";
const CARD_BODY = "flex flex-1 flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:gap-10";

const TITLE = "mt-4 text-[2.25rem] font-medium leading-none tracking-[-0.025em] text-[#0d0d0d] sm:text-5xl";
const DESC = "mt-4 text-sm leading-relaxed text-[#717171]";

const CTA =
    "inline-flex h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-none border border-black bg-black px-6 text-[12px] uppercase tracking-[0.12em] text-white transition-[background-color,border-color,color,transform] duration-200 ease-out hover:border-[#673364] hover:bg-[#673364] active:translate-y-px";

// shown when the sale has no cover image, or there's no sale to feature yet
function BannerFallback({ title, kicker }: { title: string; kicker: string }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#5A2A4C_0%,#2A1424_70%)] px-6 text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#D9B45A] sm:text-xs">{kicker}</span>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-[#F5E6D3] uppercase sm:text-5xl lg:text-6xl">{title}</h2>
        </div>
    );
}

export function FeaturedAuctionSkeleton() {
    return (
        <section className={CARD}>
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
        </section>
    );
}

export function FeaturedAuction({ auction }: { auction: PublicAuction | null }) {
    if (!auction) {
        return (
            <section className={CARD}>
                <div className={BANNER_WRAP}>
                    <div className={BANNER_FRAME}>
                        <BannerFallback kicker="Coming soon" title="New sales are being prepared" />
                    </div>
                </div>
            </section>
        );
    }

    const live = isLive(auction);
    const countdown = countdownFor(auction);

    return (
        <section className={CARD}>
            <div className={BANNER_WRAP}>
                <div className={BANNER_FRAME}>
                    {auction.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={auction.coverImageUrl} alt={auction.title} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                        <BannerFallback kicker={live ? "Live now" : "Coming soon"} title={auction.title} />
                    )}
                </div>
            </div>

            <div className={CARD_BODY}>
                <div className="min-w-0 max-w-xl">
                    <StatusBadge label={live ? "Live now" : "Coming soon"} tone={live ? "live" : "upcoming"} />
                    <h1 className={TITLE}>{auction.title}</h1>
                    {auction.short_description && <p className={DESC}>{auction.short_description}</p>}
                </div>

                <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
                    {countdown && <AuctionCountdown label={countdown.label} target={countdown.target} />}
                    <Link href={auctionHref(auction)} className={CTA}>
                        View the auction
                    </Link>
                </div>
            </div>
        </section>
    );
}
