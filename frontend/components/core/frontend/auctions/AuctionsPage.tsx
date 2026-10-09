"use client"

import { useCallback, useEffect, useState } from "react"

import { useAppSelector } from "@/hooks/redux"
import type { PublicAuction } from "@/lib/types/publicAuction.types"
import { getMyProfile, getMyRegistrations } from "@/services/operations/profile.api"
import { getFeaturedAuction } from "@/services/operations/publicAuction.api"

import { AuctionListings } from "./AuctionListings"
import { BIDDER_ROLES, bidderEligibility, type BidderEligibility } from "./auctionDisplay"
import { FeaturedAuction, FeaturedAuctionSkeleton } from "./FeaturedAuction"
import { HowToBid } from "./HowToBid"

const NO_PADDLES: Record<string, string> = {}

export function AuctionsPage() {
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)

    const [featured, setFeatured] = useState<PublicAuction | null>(null)
    const [featuredLoading, setFeaturedLoading] = useState(true)

    // auctionUuid → paddle number, for sales the signed-in bidder already registered for
    const [bidderPaddles, setBidderPaddles] = useState<Record<string, string>>({})
    const isBidder = !!token && !!role && BIDDER_ROLES.includes(role)
    const paddles = isBidder ? bidderPaddles : NO_PADDLES

    // read from the account, not the token's role — KYC approval promotes USER → BIDDER mid-session
    const [eligibilityFor, setEligibilityFor] = useState<{ token: string; value: BidderEligibility } | null>(null)
    const eligibility: BidderEligibility = !token
        ? "guest"
        : eligibilityFor?.token === token
          ? eligibilityFor.value
          : "loading"

    useEffect(() => {
        if (!token) return
        getMyProfile(token)
            .then((account) => setEligibilityFor({ token, value: bidderEligibility(account) }))
            // let them try — the server makes the final call
            .catch(() => setEligibilityFor({ token, value: "eligible" }))
    }, [token])

    useEffect(() => {
        getFeaturedAuction()
            .then(setFeatured)
            // the hero falls back to its "coming soon" state; the list below shows the error
            .catch(() => setFeatured(null))
            .finally(() => setFeaturedLoading(false))
    }, [])

    useEffect(() => {
        if (!isBidder) return
        getMyRegistrations(token)
            .then((registrations) =>
                setBidderPaddles(
                    Object.fromEntries(
                        registrations
                            .filter((r) => r.status === "APPROVED" || r.status === "PENDING")
                            .map((r) => [r.auction.uuid, String(r.paddleNumber)])
                    )
                )
            )
            // not critical — the register button is idempotent on the server
            .catch(() => setBidderPaddles({}))
    }, [isBidder, token])

    const handleRegistered = useCallback((auctionUuid: string, paddleNumber: string) => {
        setBidderPaddles((current) => ({ ...current, [auctionUuid]: paddleNumber }))
    }, [])

    return (
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-6 md:gap-16 md:px-6 md:py-8">
            {featuredLoading ? <FeaturedAuctionSkeleton /> : <FeaturedAuction auction={featured} />}
            <AuctionListings paddles={paddles} eligibility={eligibility} onRegistered={handleRegistered} />
            <HowToBid />
        </main>
    )
}
