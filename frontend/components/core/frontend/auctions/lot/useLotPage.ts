"use client"

import { useEffect, useRef, useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"

import type { PublicLotPage } from "@/lib/types/publicAuction.types"
import type { LiveLotUpdate } from "@/lib/types/bidding.types"
import { getPublicLot } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "@/lib/apiError"
import { useAuctionChannel } from "@/hooks/useAuctionChannel"

import { isLive } from "../auctionDisplay"
import { formatMoney } from "../detail/lotDisplay"

// bids arrive over the socket; this poll only runs while it's disconnected
const FALLBACK_REFRESH_MS = 10_000

// matches LADDER_SIZE in backend/src/services/publicAuction.services.js
const LADDER_SIZE = 10

export type LotPageState =
    | { status: "loading" }
    | { status: "ready"; data: PublicLotPage }
    | { status: "not-found" }
    | { status: "error"; message: string }

// a socket update merged into the page: the lot in the order of sale, and the open lot with its ladder
function applyLotUpdate(data: PublicLotPage, update: LiveLotUpdate): PublicLotPage {
    const position = {
        status: update.status,
        ...(update.currentBid !== undefined && { currentBid: update.currentBid }),
        ...(update.bidCount !== undefined && { bidCount: update.bidCount }),
    }

    const lots = data.lots.map((lot) => (lot.uuid === update.lotUuid ? { ...lot, ...position } : lot))
    if (data.lot.uuid !== update.lotUuid) return { ...data, lots }

    const fresh = (update.bids ?? []).filter((bid) => !data.lot.bids.some((known) => known.uuid === bid.uuid))
    return {
        ...data,
        lots,
        lot: {
            ...data.lot,
            ...position,
            ...(update.nextBid !== undefined && { nextBid: update.nextBid }),
            ...(update.leadingPaddle !== undefined && { leadingPaddle: update.leadingPaddle }),
            bids: [...fresh, ...data.lot.bids].slice(0, LADDER_SIZE),
        },
    }
}

// one lot plus its sale, kept live over the socket while the sale runs
export function useLotPage(auctionUuid: string, lotUuid: string) {
    const [state, setState] = useState<LotPageState>({ status: "loading" })
    const stateRef = useRef(state)
    useEffect(() => {
        stateRef.current = state
    })

    // bumped to refetch the whole page
    const [refresh, setRefresh] = useState(0)
    const refetch = () => setRefresh((n) => n + 1)
    const live = state.status === "ready" && isLive(state.data.auction)

    const connected = useAuctionChannel(auctionUuid, {
        onLotUpdate: (update) => {
            const current = stateRef.current
            if (current.status !== "ready") return
            const known = current.data.lots.find((lot) => lot.uuid === update.lotUuid)
            // a lot opening or closing changes more than its numbers (up next, the sale's progress)
            if (known && known.status !== update.status) {
                refetch()
                return
            }
            setState((prev) => (prev.status === "ready" ? { status: "ready", data: applyLotUpdate(prev.data, update) } : prev))
        },
        onAuctionStatus: refetch,
        onReconnect: refetch,
        onOutbid: (notice) => {
            const bid = formatMoney(notice.currentBid, notice.currency)
            toast(`You've been outbid on Lot ${notice.itemNumber.padStart(2, "0")}${bid ? ` — the bid is now ${bid}` : ""}`, { icon: "🔔" })
        },
    })

    // skip refreshes while the tab is hidden
    useEffect(() => {
        if (!live || connected) return
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") setRefresh((n) => n + 1)
        }, FALLBACK_REFRESH_MS)
        return () => window.clearInterval(timer)
    }, [live, connected])

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
