"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import type { PublicHomeBanner } from "@/lib/types/website.types";
import { getHomeBanners } from "@/services/operations/website.api";

import { PAGE_MAIN } from "../storefront";
import { FeaturedAuction, FeaturedAuctionSkeleton } from "./FeaturedAuction";

// the API's answer for a sale that, while it's live, is only open to the bidders picked for it
// (dashboard Settings → Live Access)
export const LIVE_ACCESS_RESTRICTED = "LIVE_ACCESS_RESTRICTED";

export const isLiveAccessRestricted = (err: unknown) =>
    axios.isAxiosError(err) && err.response?.status === 403 && err.response?.data?.code === LIVE_ACCESS_RESTRICTED;

/**
 * What everyone not picked for a restricted live sale sees on its pages: the storefront's
 * default "coming soon" banner — the same card the home page shows when no sale is on.
 */
export function LiveAccessComingSoon() {
    const [banners, setBanners] = useState<PublicHomeBanner[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        getHomeBanners()
            .then((list) => !cancelled && setBanners(list))
            // not critical — the card keeps the built-in house banner
            .catch(() => !cancelled && setBanners([]));
        return () => {
            cancelled = true;
        };
    }, []);

    return <main className={PAGE_MAIN}>{banners ? <FeaturedAuction auction={null} banners={banners} /> : <FeaturedAuctionSkeleton />}</main>;
}
