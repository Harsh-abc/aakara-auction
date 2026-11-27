"use client"

import { useEffect, useRef, useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"

import type { LotStatus, PublicLot, PublicLotPage } from "@/lib/types/publicAuction.types"
import type { LiveLotUpdate } from "@/lib/types/bidding.types"
import { getLotPreview, getPublicLot } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "@/lib/apiError"
import { useAuctionChannel } from "@/hooks/useAuctionChannel"
import { useAppSelector } from "@/hooks/redux"

import { isLive } from "../auctionDisplay"
import { isLiveAccessRestricted } from "../LiveAccessComingSoon"
import { formatMoney } from "../detail/lotDisplay"

// bids arrive over the socket; this poll only runs while it's disconnected
const FALLBACK_REFRESH_MS = 10_000

export type LotPageState =
    | { status: "loading" }
    | { status: "ready"; data: PublicLotPage }
    | { status: "not-found" }
    // the sale is live and only open to the bidders picked for it (Settings → Live Access)
    | { status: "restricted" }
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
            // the ladder keeps every bid
            bids: [...fresh, ...data.lot.bids],
        },
    }
}

// the hammer came down (or the lot was taken out) — bidding on it is over
const CLOSED_STATUSES: LotStatus[] = ["SOLD", "UNSOLD", "PASSED", "WITHDRAWN"]

export type LotClosedEvent = { lot: PublicLot; auctionTitle: string; hasNext: boolean }

// one lot plus its sale, kept live over the socket while the sale runs.
// `preview`: the dashboard's staff-only read, which also finds drafts and invite-only sales.
// `onLotClosed`: the lot on the block just closed
export function useLotPage(
    auctionUuid: string,
    lotUuid: string,
    { preview = false, onLotClosed }: { preview?: boolean; onLotClosed?: (event: LotClosedEvent) => void } = {}
) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const previewToken = preview ? token : null
    // the storefront read sends the token too (services/authSession.ts) — asked again on sign in / out
    // and refresh, since a restricted live sale only shows to the bidders picked for it
    const viewerToken = preview ? null : token
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
                if (known.status === "ACTIVE" && CLOSED_STATUSES.includes(update.status)) {
                    const hasNext = current.data.lots.some((lot) => lot.uuid !== known.uuid && (lot.status === "SCHEDULED" || lot.status === "ACTIVE"))
                    onLotClosed?.({ lot: known, auctionTitle: current.data.auction.title, hasNext })
                }
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
        onProxyOutbid: (notice) => {
            const bid = formatMoney(notice.currentBid, notice.currency)
            toast(`Your proxy bid on Lot ${notice.itemNumber.padStart(2, "0")} has been outbid${bid ? ` — the bid is now ${bid}` : ""}`, { icon: "🔔" })
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
        // the preview waits for the signed-in session before asking
        if (preview && !previewToken) return
        ;(preview ? getLotPreview(auctionUuid, lotUuid, previewToken) : getPublicLot(auctionUuid, lotUuid))
            .then((data) => {
                if (!cancelled) setState({ status: "ready", data })
            })
            .catch((err) => {
                if (cancelled) return
                if (isLiveAccessRestricted(err)) return setState({ status: "restricted" })
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
    }, [auctionUuid, lotUuid, refresh, preview, previewToken, viewerToken])

    return state
}
