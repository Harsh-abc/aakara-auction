"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useAppSelector } from "@/hooks/redux"
import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"
import { getMyLotStanding } from "@/services/operations/bidding.api"

import { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID } from "../../storefront"
import { formatMoney } from "../detail/lotDisplay"
import { isUpcomingLot } from "./lotPageDisplay"
import type { BidKind } from "./useBidAction"

export type OnBid = (kind: BidKind, lot: PublicLot) => void

// one button style across the storefront
export { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID }

// the signed-in bidder's proxy (maximum) bid on the lot — refetched when refreshKey changes (a bid was saved)
function useMyProxyMax(lot: PublicLot, refreshKey: number) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const [proxy, setProxy] = useState<{ lotUuid: string; max: string | null } | null>(null)

    const lotUuid = lot.uuid
    const lotStatus = lot.status

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getMyLotStanding(lotUuid, token)
            .then((data) => {
                if (!cancelled) setProxy({ lotUuid, max: data.proxyMax })
            })
            // the label just falls back to "Proxy bid"
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [lotUuid, lotStatus, token, refreshKey])

    return token && proxy?.lotUuid === lotUuid ? proxy.max : null
}

// "Place bid" only while the lot is on the block; "Proxy bid" can be used only before it opens (and only if the sale allows proxies).
// Once the lot is live, a bidder who left a proxy keeps seeing it (outline, under "Place bid") — except in the live room
// (swapLiveProxy), where the proxy takes the black "Place bid" slot until a live bid goes past it.
// bidHref: "Place bid" links there (the live room) instead of opening the bid dialog — even on a closed lot;
// the caller drops it once the whole auction is over
export function BidButtons({
    lot,
    onBid,
    refreshKey = 0,
    bidHref,
    bidLabel = "Place bid",
    proxyEnabled = true,
    swapLiveProxy = false,
    className,
}: {
    lot: PublicLot
    onBid: OnBid
    refreshKey?: number
    bidHref?: string
    /** the text of the bidHref link — "Place bid" / "View live lot" / "View upcoming lot" */
    bidLabel?: string
    /** the sale's proxy bidding switch (auction.proxyBiddingEnabled) */
    proxyEnabled?: boolean
    /** live room: while the bidder's proxy is in play it replaces the black "Place bid" button */
    swapLiveProxy?: boolean
    className?: string
}) {
    // proxies can be left / changed only before the lot opens, and only if the sale allows them
    const proxyOpen = proxyEnabled && isUpcomingLot(lot)
    const proxyMax = useMyProxyMax(lot, refreshKey)
    const proxyAmount = proxyMax ? formatMoney(proxyMax, lot.currency) : null
    // the lot is on the block and the bidder left a proxy on it — shown even if the sale's proxy switch
    // was turned off since: proxies already left still bid (see the Proxy Bids page)
    const liveProxy = lot.status === "ACTIVE" && proxyMax !== null
    // still in play — same rule as the engine's "proxy:outbid" (out once a live bid goes past the maximum),
    // so the outbid toast and the buttons switching happen together (currentBid updates over the socket)
    const proxyInPlay = liveProxy && (lot.currentBid === null || Number(lot.currentBid) <= Number(proxyMax))

    if (swapLiveProxy && proxyInPlay) {
        return (
            <div className={cn("flex flex-col gap-2", className)}>
                <button type="button" onClick={() => onBid("proxy", lot)} className={cn(BUTTON, BUTTON_SOLID)}>
                    Your proxy bid · {proxyAmount}
                </button>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {bidHref ? (
                <Link href={bidHref} className={cn(BUTTON, BUTTON_SOLID)}>
                    {bidLabel}
                </Link>
            ) : (
                <button type="button" onClick={() => onBid("bid", lot)} disabled={lot.status !== "ACTIVE"} className={cn(BUTTON, BUTTON_SOLID)}>
                    Place bid
                </button>
            )}
            {(proxyOpen || liveProxy) && (
                <button
                    type="button"
                    onClick={() => onBid("proxy", lot)}
                    disabled={!proxyOpen}
                    title={proxyOpen ? undefined : proxyInPlay ? "Proxy bids can't be changed once the lot opens" : "Your proxy bid has been outbid"}
                    className={cn(BUTTON, BUTTON_OUTLINE)}
                >
                    {proxyAmount ? `Your proxy bid · ${proxyAmount}` : "Proxy bid"}
                </button>
            )}
        </div>
    )
}
