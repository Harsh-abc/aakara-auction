"use client"

import { useEffect, useState } from "react"

import { getSocket } from "@/lib/socket"
import type { LotCallout } from "@/lib/types/bidding.types"

/** How long a callout stays on screen unless a newer one replaces it */
const SHOW_MS = 12_000

/**
 * The auctioneer's latest callout to the sale ("Fair warning", "Going once"), cleared
 * after a few seconds. Listens only — the room is joined by useAuctionChannel.
 */
export function useLotCallout(auctionUuid: string): LotCallout | null {
    const [latest, setLatest] = useState<LotCallout | null>(null)

    useEffect(() => {
        const socket = getSocket()
        const onCallout = (callout: LotCallout) => {
            if (callout?.auctionUuid === auctionUuid) setLatest(callout)
        }
        socket.on("lot:callout", onCallout)
        return () => {
            socket.off("lot:callout", onCallout)
        }
    }, [auctionUuid])

    useEffect(() => {
        if (!latest) return
        const timer = window.setTimeout(() => setLatest(null), SHOW_MS)
        return () => window.clearTimeout(timer)
    }, [latest])

    return latest?.auctionUuid === auctionUuid ? latest : null
}
