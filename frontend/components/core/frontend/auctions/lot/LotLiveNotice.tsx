"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useAppSelector } from "@/hooks/redux"
import { getSocket, setSocketToken } from "@/lib/socket"
import type { LotLiveNotice as LotLive } from "@/lib/types/bidding.types"
import { cn } from "@/lib/utils"

import { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID, EYEBROW } from "../../storefront"
import { lotHref } from "../detail/lotDisplay"
import { Tag } from "./LotTag"

// the sale's live room already follows the lot on the block — no popup there
const inLiveRoom = (pathname: string, auctionUuid: string) =>
    pathname.startsWith(`/auctions/${auctionUuid}/lots/`) && !pathname.endsWith("/details")

/**
 * "Lot 06 is live" — shown on whichever storefront page is open the moment a lot goes on the
 * block, with a link to it in the live room. The server sends "lot:live" to every tab for a
 * public sale and to the registered bidders for an invite-only one. Mounted once in the
 * storefront layout.
 */
export function LotLiveNotice() {
    const token = useAppSelector((state) => state.auth.accessToken)
    const pathname = usePathname()
    const [notice, setNotice] = useState<LotLive | null>(null)

    // read in the socket handler without re-subscribing on every navigation
    const pathRef = useRef(pathname)
    useEffect(() => {
        pathRef.current = pathname
    }, [pathname])

    useEffect(() => {
        // signed in: also hears invite-only sales the user is registered for
        setSocketToken(token ?? null)
        const socket = getSocket()
        const onLive = (next: LotLive) => {
            if (inLiveRoom(pathRef.current, next.auctionUuid)) return
            // only the latest lot matters — the one before it is no longer on the block
            setNotice(next)
        }
        socket.on("lot:live", onLive)
        return () => {
            socket.off("lot:live", onLive)
        }
    }, [token])

    // moved into that sale's live room (by the link or otherwise) → the popup has done its job
    const showing = notice && !inLiveRoom(pathname, notice.auctionUuid) ? notice : null
    if (!showing) return null

    const close = () => setNotice(null)
    const lotLabel = `Lot ${showing.itemNumber.padStart(2, "0")}`

    return (
        <Dialog open onOpenChange={(open) => !open && close()}>
            <DialogContent className="gap-0 rounded-none bg-white p-0 sm:max-w-md">
                <div className="border-b border-[#cecece] px-6 pt-8 pb-6 text-center">
                    <p className={EYEBROW}>{showing.auctionTitle ?? "Live auction"}</p>
                    <DialogTitle className="mt-2 flex items-center justify-center gap-2 text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">
                        {lotLabel} is live
                        <Tag tone="live" label="Live" />
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-[14px] leading-5 text-[#717171]">
                        Bidding is open now. Join the live room to follow the lot and place your bid.
                    </DialogDescription>
                </div>

                <div className="px-6 py-5 text-center">
                    {showing.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={showing.image} alt={showing.title} className="mx-auto mb-4 max-h-48 w-auto object-contain" />
                    )}
                    {showing.artistName && <p className="text-[18px] leading-7 font-medium text-[#0d0d0d]">{showing.artistName}</p>}
                    <p className="text-[14px] leading-5 text-[#717171]">{showing.title}</p>

                    <div className="mt-6 grid gap-3">
                        <Link href={lotHref(showing.auctionUuid, { uuid: showing.lotUuid })} onClick={close} className={cn(BUTTON, BUTTON_SOLID)}>
                            Go to the live lot
                        </Link>
                        <button type="button" onClick={close} className={cn(BUTTON, BUTTON_OUTLINE)}>
                            Not now
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
