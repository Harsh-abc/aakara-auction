"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useAppSelector } from "@/hooks/redux"
import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"
import { getMyLotStanding } from "@/services/operations/bidding.api"

import { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID } from "../../storefront"
import { formatMoney } from "../detail/lotDisplay"
import { isClosedLot, isUpcomingLot } from "./lotPageDisplay"
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

// "Place a bid" only while the lot is on the block; proxy bids only before it opens.
// bidHref: "Place a bid" links there (the live room) instead of opening the bid dialog — open until the lot closes
export function BidButtons({
    lot,
    onBid,
    refreshKey = 0,
    bidHref,
    className,
}: {
    lot: PublicLot
    onBid: OnBid
    refreshKey?: number
    bidHref?: string
    className?: string
}) {
    const proxyOpen = isUpcomingLot(lot)
    const proxyMax = useMyProxyMax(lot, refreshKey)
    const proxyAmount = proxyMax ? formatMoney(proxyMax, lot.currency) : null

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {bidHref && !isClosedLot(lot) ? (
                <Link href={bidHref} className={cn(BUTTON, BUTTON_SOLID)}>
                    Place bid
                </Link>
            ) : (
                <button type="button" onClick={() => onBid("bid", lot)} disabled={lot.status !== "ACTIVE"} className={cn(BUTTON, BUTTON_SOLID)}>
                    Place bid
                </button>
            )}
            <button
                type="button"
                onClick={() => onBid("proxy", lot)}
                disabled={!proxyOpen}
                title={proxyOpen ? undefined : "Proxy bids close when the lot opens"}
                className={cn(BUTTON, BUTTON_OUTLINE)}
            >
                {proxyAmount ? `Your proxy bid · ${proxyAmount}` : "Proxy bid"}
            </button>
        </div>
    )
}
