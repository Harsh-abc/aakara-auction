"use client";

import { useCallback, useEffect, useState } from "react";

import { useAppSelector } from "@/hooks/redux";
import type { PublicAuction } from "@/lib/types/publicAuction.types";
import type { PublicHomeBanner } from "@/lib/types/website.types";
import { getMyProfile, getMyRegistrations } from "@/services/operations/profile.api";
import { getFeaturedAuction } from "@/services/operations/publicAuction.api";
import { getHomeBanners } from "@/services/operations/website.api";

import { PAGE_MAIN } from "../storefront";
import { bidderEligibility, type BidderEligibility } from "./auctionDisplay";
import { AuctionListings } from "./AuctionListings";
import { FeaturedAuction, FeaturedAuctionSkeleton } from "./FeaturedAuction";
import { HowToBid } from "./HowToBid";

// customer accounts (not team members) — only BIDDER can actually register; a super admin assigns it
const BIDDER_ROLES = ["BIDDER", "USER"];

const NO_PADDLES: Record<string, string> = {};

export function AuctionsPage() {
    const token = useAppSelector((state) => state.auth.accessToken);
    const role = useAppSelector((state) => state.auth.role);

    const [featured, setFeatured] = useState<PublicAuction | null>(null);
    const [featuredLoading, setFeaturedLoading] = useState(true);

    // auctionUuid → paddle number, for sales the signed-in bidder already registered for
    const [bidderPaddles, setBidderPaddles] = useState<Record<string, string>>({});
    const isBidder = !!token && !!role && BIDDER_ROLES.includes(role);
    const paddles = isBidder ? bidderPaddles : NO_PADDLES;

    // read from the account, not the token's role — KYC status can change mid-session
    const [eligibilityFor, setEligibilityFor] = useState<{ token: string; value: BidderEligibility } | null>(null);
    const eligibility: BidderEligibility = !token ? "guest" : eligibilityFor?.token === token ? eligibilityFor.value : "loading";

    useEffect(() => {
        if (!token) return;
        getMyProfile(token)
            .then((account) => setEligibilityFor({ token, value: bidderEligibility(account) }))
            // let them try — the server makes the final call
            .catch(() => setEligibilityFor({ token, value: "eligible" }));
    }, [token]);

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

    useEffect(() => {
        if (!isBidder) return;
        getMyRegistrations(token)
            .then((registrations) =>
                setBidderPaddles(Object.fromEntries(registrations.filter((r) => r.status === "APPROVED" || r.status === "PENDING").map((r) => [r.auction.uuid, String(r.paddleNumber)]))),
            )
            // not critical — the register button is idempotent on the server
            .catch(() => setBidderPaddles({}));
    }, [isBidder, token]);

    const handleRegistered = useCallback((auctionUuid: string, paddleNumber: string) => {
        setBidderPaddles((current) => ({ ...current, [auctionUuid]: paddleNumber }));
    }, []);

    return (
        <main className={PAGE_MAIN}>
            {featuredLoading ? <FeaturedAuctionSkeleton /> : <FeaturedAuction auction={featured} banners={banners} />}
            <AuctionListings paddles={paddles} eligibility={eligibility} onRegistered={handleRegistered} />
            <HowToBid />
        </main>
    );
}
