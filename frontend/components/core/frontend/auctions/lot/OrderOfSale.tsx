"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ImageOff } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"

import { formatMoney, lotHeading, lotHref } from "../detail/lotDisplay"
import { Tag } from "./LotTag"
import { auctioneerCall, closedLabel, isClosedLot, lotTag, lotNo, upNextLot } from "./lotPageDisplay"

type OrderOfSaleProps = {
    auctionUuid: string
    lots: PublicLot[]
    /** the lot this page is showing */
    currentLotUuid: string
    saleClosed: boolean
    className?: string
}

// what's on the block — the live lot, with the auctioneer's call under it
function OnTheBlock({ lot, saleClosed }: { lot: PublicLot | null; saleClosed: boolean }) {
    return (
        <div className="border-b border-[#cecece] p-4">
            <div className="relative flex aspect-[266/150] items-center justify-center overflow-hidden bg-[#ebebeb]">
                {lot?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lot.image} alt={lotHeading(lot)} className="h-full w-full object-contain" />
                ) : (
                    <ImageOff className="size-6 text-neutral-400" />
                )}

                {lot && (
                    <>
                        <span className="absolute top-3 left-4.25 flex h-5 items-center bg-white px-2.25 text-[10px] leading-3.75 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">
                            {lotTag(lot)}
                        </span>
                        <Tag tone="live" label="Live" className="absolute top-3 right-3" />
                        <span className="absolute right-3 bottom-3 flex h-5.75 w-7.25 items-center justify-center bg-white" aria-hidden>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/icons/volume-off.svg" alt="" width={15} height={15} />
                        </span>
                    </>
                )}
            </div>

            <p className="mt-4 text-[12px] leading-[19.5px] text-[#717171]">
                {lot ? auctioneerCall(lot) : saleClosed ? "This sale has closed." : "No lot is on the block right now."}
            </p>
        </div>
    )
}

export function OrderOfSale({ auctionUuid, lots, currentLotUuid, saleClosed, className }: OrderOfSaleProps) {
    const liveLot = lots.find((lot) => lot.status === "ACTIVE") ?? null
    const upNext = upNextLot(lots)
    const hammered = lots.filter(isClosedLot).length

    // bring the lot on the block (or the one being viewed) into the list's view, without moving the page
    const listRef = useRef<HTMLOListElement>(null)
    const focusUuid = liveLot?.uuid ?? currentLotUuid
    useEffect(() => {
        const list = listRef.current
        const row = list?.querySelector<HTMLElement>(`[data-lot="${focusUuid}"]`)
        if (list && row) list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 3)
    }, [focusUuid])

    return (
        <aside className={cn("self-start border border-[#cecece] bg-white", className)}>
            <OnTheBlock lot={liveLot} saleClosed={saleClosed} />

            <div className="flex h-11.25 items-center justify-between border-b border-[#cecece] px-4">
                <h2 className="text-[14px] leading-5 font-medium text-[#0d0d0d]">Order of sale</h2>
                <span className="text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">
                    {hammered} of {lots.length} hammered
                </span>
            </div>

            <ol ref={listRef} className="relative max-h-152 overflow-y-auto">
                {lots.map((lot) => {
                    const live = lot.status === "ACTIVE"
                    const next = lot.uuid === upNext?.uuid
                    const closed = isClosedLot(lot)
                    const current = lot.uuid === currentLotUuid
                    const sold = lot.status === "SOLD" ? formatMoney(lot.currentBid, lot.currency) : null

                    return (
                        <li key={lot.uuid} data-lot={lot.uuid} className={cn("border-b", live ? "border-black" : "border-[#cecece]")}>
                            <Link
                                href={lotHref(auctionUuid, lot)}
                                aria-current={current ? "page" : undefined}
                                className={cn(
                                    "flex items-center px-4",
                                    live ? "h-11.75 bg-[#0d0d0d] text-white" : next ? "h-10.75" : "h-10",
                                    !live && (current ? "bg-[#f5f5f5]" : "hover:bg-[#fafafa]")
                                )}
                            >
                                <span
                                    className={cn(
                                        "w-14 shrink-0 text-[11px] leading-[13.2px] tracking-[0.16em] uppercase",
                                        live ? "text-white" : "text-[#717171]"
                                    )}
                                >
                                    {lotNo(lot)}
                                </span>
                                <span
                                    className={cn(
                                        "min-w-0 flex-1 truncate text-[14px] leading-5",
                                        live ? "font-medium text-white" : closed ? "text-[#717171]" : "text-[#0d0d0d]"
                                    )}
                                >
                                    {lotHeading(lot)}
                                </span>
                                {live ? (
                                    <Tag tone="live" label="Live" className="ml-2" />
                                ) : next ? (
                                    <Tag tone="up-next" label="Up next" className="ml-2" />
                                ) : closed ? (
                                    <span className="ml-2 shrink-0 text-right text-[12px] leading-4 text-[#717171]">{sold ?? closedLabel(lot)}</span>
                                ) : null}
                            </Link>
                        </li>
                    )
                })}
            </ol>
        </aside>
    )
}
