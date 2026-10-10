"use client"

import { useEffect, useState } from "react"
import axios from "axios"

import type { PublicLotPage } from "@/lib/types/publicAuction.types"
import { getPublicLot } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "@/lib/apiError"

import { isLive } from "../auctionDisplay"

// while the sale is live the lot, its bids and the order of sale refresh on this beat
const LIVE_REFRESH_MS = 10_000

export type LotPageState =
    | { status: "loading" }
    | { status: "ready"; data: PublicLotPage }
    | { status: "not-found" }
    | { status: "error"; message: string }

// one lot plus its sale, kept fresh while the sale is live
export function useLotPage(auctionUuid: string, lotUuid: string) {
    const [state, setState] = useState<LotPageState>({ status: "loading" })

    // bumped on each live refresh
    const [refresh, setRefresh] = useState(0)
    const live = state.status === "ready" && isLive(state.data.auction)

    // only a live sale moves; skip refreshes while the tab is hidden
    useEffect(() => {
        if (!live) return
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") setRefresh((n) => n + 1)
        }, LIVE_REFRESH_MS)
        return () => window.clearInterval(timer)
    }, [live])

    useEffect(() => {
        let cancelled = false
        getPublicLot(auctionUuid, lotUuid)
            .then((data) => {
                if (!cancelled) setState({ status: "ready", data })
            })
            .catch((err) => {
                if (cancelled) return
                const status = axios.isAxiosError(err) ? err.response?.status : undefined
                const notFound = status === 404 || status === 400
                // a failed refresh keeps the last good page on screen
                setState((prev) =>
                    prev.status === "ready" && !notFound
                        ? prev
                        : notFound
                          ? { status: "not-found" }
                          : { status: "error", message: getErrorMessage(err) }
                )
            })
        return () => {
            cancelled = true
        }
    }, [auctionUuid, lotUuid, refresh])

    return state
}
