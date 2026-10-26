"use client"

import { useCallback, useEffect, useState } from "react"

import { useAppSelector } from "@/hooks/redux"
import { getMyProfile, getMyRegistrations } from "@/services/operations/profile.api"

import { bidderEligibility, type BidderEligibility } from "./auctionDisplay"

// customer accounts (not team members) — only BIDDER can actually register; a super admin assigns it
const BIDDER_ROLES = ["BIDDER", "USER"]

const NO_PADDLES: Record<string, string> = {}

/**
 * What the signed-in visitor can do about registering for sales (used by the home list and the sale page):
 * their eligibility (guest / KYC pending / eligible …) and the paddle they hold for each sale.
 */
export function useBidderStatus() {
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)

    // auctionUuid → paddle number, for sales the signed-in bidder already registered for
    const [bidderPaddles, setBidderPaddles] = useState<Record<string, string>>({})
    const isBidder = !!token && !!role && BIDDER_ROLES.includes(role)
    const paddles = isBidder ? bidderPaddles : NO_PADDLES

    // read from the account, not the token's role — KYC status can change mid-session
    const [eligibilityFor, setEligibilityFor] = useState<{ token: string; value: BidderEligibility } | null>(null)
    const eligibility: BidderEligibility = !token ? "guest" : eligibilityFor?.token === token ? eligibilityFor.value : "loading"

    useEffect(() => {
        if (!token) return
        getMyProfile(token)
            .then((account) => setEligibilityFor({ token, value: bidderEligibility(account) }))
            // let them try — the server makes the final call
            .catch(() => setEligibilityFor({ token, value: "eligible" }))
    }, [token])

    useEffect(() => {
        if (!isBidder) return
        getMyRegistrations(token)
            .then((registrations) =>
                setBidderPaddles(
                    Object.fromEntries(
                        registrations
                            .filter((r) => r.status === "APPROVED" || r.status === "PENDING")
                            .map((r) => [r.auction.uuid, String(r.paddleNumber)]),
                    ),
                ),
            )
            // not critical — the register button is idempotent on the server
            .catch(() => setBidderPaddles({}))
    }, [isBidder, token])

    const onRegistered = useCallback((auctionUuid: string, paddleNumber: string) => {
        setBidderPaddles((current) => ({ ...current, [auctionUuid]: paddleNumber }))
    }, [])

    return { paddles, eligibility, onRegistered }
}
