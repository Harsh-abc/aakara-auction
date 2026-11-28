"use client"

import { useEffect, useState } from "react"

import { getSocket } from "@/lib/socket"
import type { LotCallout } from "@/lib/types/bidding.types"

/** How long a callout stays on screen unless a newer one replaces it */
const SHOW_MS = 12_000
// a callout picked up late isn't worth flashing for less than this
const MIN_LATE_SHOW_MS = 3_000

type Shown = { callout: LotCallout; showMs: number }

/**
 * The auctioneer's latest callout to the sale ("Fair warning", "Going once"), cleared
 * after a few seconds. Listens only — the room is joined by useAuctionChannel.
 *
 * A callout is sent once, to whoever is connected at that moment. A tab whose connection dropped or
 * was switching networks then would miss it, so on every (re)connect it also asks the server for the
 * latest one (kept a few seconds) and shows it for the time it has left.
 */
export function useLotCallout(auctionUuid: string): LotCallout | null {
    const [latest, setLatest] = useState<Shown | null>(null)

    useEffect(() => {
        const socket = getSocket()
        let cancelled = false
        const show = (callout: LotCallout, showMs = SHOW_MS) =>
            // the same callout from both the event and the catch-up is shown once
            setLatest((prev) => (prev?.callout.id === callout.id ? prev : { callout, showMs }))

        const onCallout = (callout: LotCallout) => {
            if (callout?.auctionUuid === auctionUuid) show(callout)
        }
        const catchUp = () =>
            socket.emit("callout:latest", { auctionUuid }, (result?: { ok?: boolean; callout?: LotCallout | null; ageMs?: number }) => {
                const callout = result?.callout
                if (cancelled || !result?.ok || !callout || callout.auctionUuid !== auctionUuid) return
                const left = SHOW_MS - (result.ageMs ?? 0)
                if (left >= MIN_LATE_SHOW_MS) show(callout, left)
            })

        socket.on("lot:callout", onCallout)
        socket.on("connect", catchUp)
        if (socket.connected) catchUp()
        return () => {
            cancelled = true
            socket.off("lot:callout", onCallout)
            socket.off("connect", catchUp)
        }
    }, [auctionUuid])

    useEffect(() => {
        if (!latest) return
        const timer = window.setTimeout(() => setLatest(null), latest.showMs)
        return () => window.clearTimeout(timer)
    }, [latest])

    return latest?.callout.auctionUuid === auctionUuid ? latest.callout : null
}
