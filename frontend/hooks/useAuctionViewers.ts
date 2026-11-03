"use client"

import { useEffect, useState } from "react"

import { getSocket } from "@/lib/socket"
import type { AuctionViewers } from "@/lib/types/bidding.types"

/**
 * How many people are watching the sale's live room right now (each account or browser once,
 * however many tabs). Listens only — the room is joined by useAuctionChannel. null until the
 * first count arrives, and while the socket is disconnected.
 */
export function useAuctionViewers(auctionUuid: string): number | null {
    const [latest, setLatest] = useState<AuctionViewers | null>(null)

    useEffect(() => {
        const socket = getSocket()

        const onViewers = (payload: AuctionViewers) => {
            if (payload?.auctionUuid !== auctionUuid) return
            // counts from different servers can cross on the way — keep the newest
            setLatest((prev) => (prev && prev.auctionUuid === auctionUuid && prev.version > payload.version ? prev : payload))
        }
        // a fresh count is sent when the room is rejoined
        const onDisconnect = () => setLatest(null)

        socket.on("auction:viewers", onViewers)
        socket.on("disconnect", onDisconnect)
        return () => {
            socket.off("auction:viewers", onViewers)
            socket.off("disconnect", onDisconnect)
        }
    }, [auctionUuid])

    return latest?.auctionUuid === auctionUuid ? latest.count : null
}
