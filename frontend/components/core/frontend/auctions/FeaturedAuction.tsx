import Image from "next/image";
import Link from "next/link";

import RichTextContent from "@/components/common/RichTextContent";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicAuction } from "@/lib/types/publicAuction.types";
import { cn } from "@/lib/utils";

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_SOLID } from "../storefront";
import { AuctionCountdown } from "./AuctionCountdown";
import { auctionHref, countdownFor, isLive } from "./auctionDisplay";
import { StatusBadge } from "./StatusBadge";

// Figma: "Auction Landing page" hero card — 8:3 banner over a 24px body
const CARD = "border border-[#cecece] bg-white p-px";
const BANNER = "relative aspect-4/3 w-full overflow-hidden bg-[#ebebeb] sm:aspect-8/3";
const BODY_ROW = "flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:gap-10";
const TITLE = "mt-4 text-[36px] leading-none font-medium tracking-tight text-[#0d0d0d] sm:text-[48px]";

// the house banner (Figma "hero banner") — used until a sale has its own cover image
function HouseBanner({ priority }: { priority?: boolean }) {
    return <Image src="/banners/inaugural-coming-soon.png" alt="Akara — inaugural fine art auction, coming soon" fill priority={priority} sizes="(min-width: 1200px) 1150px, 100vw" className="object-cover" />;
}

export function FeaturedAuctionSkeleton() {
    return (
        <section>
            <div className="page-container">
                <div className={CARD}>
                    <Skeleton className={cn(BANNER, "rounded-none")} />
                    <div className={BODY_ROW}>
                        <div className="w-full max-w-lg">
                            <Skeleton className="h-5.75 w-24 rounded-none" />
                            <Skeleton className="mt-4 h-12 w-64 rounded-none" />
                            <Skeleton className="mt-4 h-4 w-full rounded-none" />
                        </div>
                        <Skeleton className="h-11 w-44 rounded-none" />
                    </div>
                </div>
            </div>
        </section>
    );
}

export function FeaturedAuction({ auction }: { auction: PublicAuction | null }) {
    // nothing published yet — the house banner with a way into the listings below
    if (!auction) {
        return (
            <section>
                <div className="page-container">
                    <div className={CARD}>
                        <div className={BANNER}>
                            <HouseBanner priority />
                        </div>
                        <div className={BODY_ROW}>
                            <div className="min-w-0 max-w-lg">
                                <StatusBadge label="Coming soon" tone="upcoming" />
                                <h1 className={TITLE}>New sales coming soon</h1>
                                <p className={cn(BODY, "mt-4")}>
                                    A new season of modern and contemporary South Asian art is preparing to open. Register early to preview the catalogue and receive alerts when bidding begins.
                                </p>
                            </div>
                            <Link href="#auctions" className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE, "shrink-0")}>
                                Browse all auctions
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const live = isLive(auction);
    const countdown = countdownFor(auction);

    return (
        <section>
            <div className="page-container">
                <div className={CARD}>
                    <div className={BANNER}>
                        {auction.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={auction.coverImageUrl} alt={auction.title} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                            <HouseBanner priority />
                        )}
                    </div>

                    <div className={BODY_ROW}>
                        <div className="min-w-0 max-w-lg">
                            <StatusBadge label={live ? "Live now" : "Coming soon"} tone={live ? "live" : "upcoming"} />
                            <h1 className={TITLE}>{auction.title}</h1>
                            <RichTextContent html={auction.short_description} className={cn(BODY, "mt-4 [&_p+p]:mt-2")} />
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                            {countdown && <AuctionCountdown label={countdown.label} target={countdown.target} />}
                            <Link href={auctionHref(auction)} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE)}>
                                View the auction
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
