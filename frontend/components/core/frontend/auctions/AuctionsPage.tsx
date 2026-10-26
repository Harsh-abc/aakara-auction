"use client";

import { Suspense, useEffect, useState } from "react";

import type { PublicAuction } from "@/lib/types/publicAuction.types";
import type { PublicHomeBanner } from "@/lib/types/website.types";
import { getFeaturedAuction } from "@/services/operations/publicAuction.api";
import { getHomeBanners } from "@/services/operations/website.api";

import { PAGE_MAIN } from "../storefront";
import { AuctionListings } from "./AuctionListings";
import { FeaturedAuction, FeaturedAuctionSkeleton } from "./FeaturedAuction";
import { HowToBid } from "./HowToBid";
import { useBidderStatus } from "./useBidderStatus";

export function AuctionsPage() {
    const { paddles, eligibility, onRegistered } = useBidderStatus();

    const [featured, setFeatured] = useState<PublicAuction | null>(null);
    const [featuredLoading, setFeaturedLoading] = useState(true);

    // the hero's default images (Settings → Website), for when there's no sale or it has no cover
    const [banners, setBanners] = useState<PublicHomeBanner[]>([]);

    useEffect(() => {
        // wait for both so the hero doesn't flash the house banner before the real images
        Promise.all([
            getFeaturedAuction()
                .then(setFeatured)
                // the hero falls back to its "coming soon" state; the list below shows the error
                .catch(() => setFeatured(null)),
            getHomeBanners()
                .then(setBanners)
                // not critical — the hero keeps the built-in house banner
                .catch(() => setBanners([])),
        ]).finally(() => setFeaturedLoading(false));
    }, []);

    return (
        <main className={PAGE_MAIN}>
            {featuredLoading ? <FeaturedAuctionSkeleton /> : <FeaturedAuction auction={featured} banners={banners} />}
            {/* AuctionListings reads ?tab= (useSearchParams), which needs a Suspense boundary */}
            <Suspense>
                <AuctionListings paddles={paddles} eligibility={eligibility} onRegistered={onRegistered} />
            </Suspense>
            <HowToBid />
        </main>
    );
}
