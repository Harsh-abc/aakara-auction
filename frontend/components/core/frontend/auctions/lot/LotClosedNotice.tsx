"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useAppSelector } from "@/hooks/redux"
import { getSocket } from "@/lib/socket"
import type { LotWonNotice } from "@/lib/types/bidding.types"
import { cn } from "@/lib/utils"

import { BUTTON, BUTTON_SOLID, EYEBROW } from "../../storefront"

// the notice closes on its own after this long
const AUTO_CLOSE_SECONDS = 10
// "lot:won" reaches the buyer a moment after the lot closes — wait for it so the buyer only sees their own popup
const WINNER_GRACE_MS = 1200

export type LotClosed = {
    lotUuid: string
    itemNumber: string
    title: string
    artistName: string | null
    auctionTitle: string | null
    /** another lot is still to come in the sale */
    hasNext: boolean
}

// kept outside React: the live room remounts when it moves on to the next lot, the notice must survive that
let current: LotClosed | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

// lots this browser has been told it won — those get the winner's popup instead
const wonLots = new Set<string>()
const pending = new Map<string, number>()

/** the live room calls this when the lot on the block closes */
export function announceLotClosed(notice: LotClosed) {
    if (wonLots.has(notice.lotUuid) || pending.has(notice.lotUuid)) return
    pending.set(
        notice.lotUuid,
        window.setTimeout(() => {
            pending.delete(notice.lotUuid)
            if (wonLots.has(notice.lotUuid)) return
            current = notice
            emit()
        }, WINNER_GRACE_MS)
    )
}

function dismiss() {
    current = null
    emit()
}

/**
 * "This lot has closed" — shown in the live room to everyone but the buyer each time the
 * auctioneer brings the hammer down, so the jump to the next lot isn't a surprise.
 * Mounted once in the storefront layout.
 */
export function LotClosedNotice() {
    const notice = useSyncExternalStore(subscribe, () => current, () => null)
    const token = useAppSelector((state) => state.auth.accessToken)

    // the buyer gets the winner's popup — never both
    useEffect(() => {
        if (!token) return
        const socket = getSocket()
        const onWon = (won: LotWonNotice) => {
            wonLots.add(won.lotUuid)
            const timer = pending.get(won.lotUuid)
            if (timer !== undefined) {
                window.clearTimeout(timer)
                pending.delete(won.lotUuid)
            }
            if (current?.lotUuid === won.lotUuid) dismiss()
        }
        socket.on("lot:won", onWon)
        return () => {
            socket.off("lot:won", onWon)
        }
    }, [token])

    if (!notice) return null
    // keyed so each closed lot restarts the countdown
    return <ClosedDialog key={notice.lotUuid} notice={notice} />
}

function ClosedDialog({ notice }: { notice: LotClosed }) {
    const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS)

    useEffect(() => {
        const timer = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000)
        return () => window.clearInterval(timer)
    }, [])

    useEffect(() => {
        if (secondsLeft <= 0) dismiss()
    }, [secondsLeft])

    const lotLabel = `Lot ${notice.itemNumber.padStart(2, "0")}`

    return (
        <Dialog open onOpenChange={(open) => !open && dismiss()}>
            <DialogContent className="gap-0 rounded-none bg-white p-0 sm:max-w-md">
                <div className="border-b border-[#cecece] px-6 pt-8 pb-6 text-center">
                    <p className={EYEBROW}>{notice.auctionTitle ?? "Live auction"}</p>
                    <DialogTitle className="mt-2 text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">
                        {lotLabel} has closed
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-[14px] leading-5 text-[#717171]">
                        Bidding on this lot is now over.
                        {notice.hasNext ? " The auction is moving on to the next lot." : ""}
                    </DialogDescription>
                </div>

                <div className="px-6 py-5 text-center">
                    {notice.artistName && <p className="text-[18px] leading-7 font-medium text-[#0d0d0d]">{notice.artistName}</p>}
                    <p className="text-[14px] leading-5 text-[#717171]">{notice.title}</p>

                    <div className="mt-6 grid gap-3">
                        <button type="button" onClick={dismiss} className={cn(BUTTON, BUTTON_SOLID)}>
                            {notice.hasNext ? "Continue to the next lot" : "Continue"}
                        </button>
                    </div>
                    <p className="mt-3 text-[12px] leading-4 text-[#717171]" aria-live="polite">
                        Closes automatically in {Math.max(secondsLeft, 0)}s
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
