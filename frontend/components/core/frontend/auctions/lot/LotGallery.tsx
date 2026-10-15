"use client"

import { useState } from "react"
import Link from "next/link"
import { ImageOff, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PublicLot, PublicLotDetail } from "@/lib/types/publicAuction.types"

import { lotDetailsHref, lotHeading } from "../detail/lotDisplay"
import { LotImageZoom } from "./LotImageZoom"
import { LotLightbox } from "./LotLightbox"
import { lotTag } from "./lotPageDisplay"

// prev / next sit edge to edge at one width (the second overlaps the shared border)
const PAGER = "inline-flex h-6.5 w-18 items-center justify-center border border-[#333] bg-white text-[12px] leading-4 text-[#0d0d0d]"

function Pager({ auctionUuid, lot, label, className }: { auctionUuid: string; lot: PublicLot | null; label: string; className?: string }) {
    return lot ? (
        <Link href={lotDetailsHref(auctionUuid, lot)} className={cn(PAGER, "hover:bg-[#fdedd6]", className)} aria-label={`${label} lot: ${lotHeading(lot)}`}>
            {label === "Previous" ? "‹ Prev" : "Next ›"}
        </Link>
    ) : (
        <span className={cn(PAGER, "cursor-not-allowed text-[#0d0d0d]/40", className)} aria-disabled>
            {label === "Previous" ? "‹ Prev" : "Next ›"}
        </span>
    )
}

type LotGalleryProps = {
    auctionUuid: string
    lot: PublicLotDetail
    /** the sale's lots in order, for prev / next */
    lots: PublicLot[]
}

export function LotGallery({ auctionUuid, lot, lots }: LotGalleryProps) {
    const [selected, setSelected] = useState(0)
    // the full-screen viewer, opened on the selected image
    const [viewing, setViewing] = useState(false)
    const media = lot.media
    const current = media[selected] ?? null

    const index = lots.findIndex((item) => item.uuid === lot.uuid)
    const prev = index > 0 ? lots[index - 1] : null
    const next = index >= 0 && index < lots.length - 1 ? lots[index + 1] : null

    return (
        <div>
            <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">{lotTag(lot)}</span>
                <div className="flex">
                    <Pager auctionUuid={auctionUuid} lot={prev} label="Previous" />
                    <Pager auctionUuid={auctionUuid} lot={next} label="Next" className="-ml-px" />
                </div>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-4 sm:flex-row sm:gap-7.5">
                {media.length > 0 && (
                    // beside the image the strip is as tall as the image and scrolls past that
                    <div className="relative shrink-0 sm:w-22">
                        <div className="flex gap-3 overflow-x-auto scrollbar-none sm:absolute sm:inset-0 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto">
                            {media.map((item, i) => (
                                <button
                                    key={item.url}
                                    type="button"
                                    onClick={() => setSelected(i)}
                                    aria-label={`Show image ${i + 1}`}
                                    aria-pressed={i === selected}
                                    className={cn(
                                        "size-21 shrink-0 cursor-pointer border p-0.75",
                                        i === selected ? "border-[#0d0d0d]" : "border-transparent hover:border-[#cecece]"
                                    )}
                                >
                                    <span className="relative flex size-full items-center justify-center overflow-hidden bg-[#ebebeb]">
                                        {item.mediaType === "VIDEO" ? (
                                            <Play className="size-5 text-[#717171]" />
                                        ) : (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.thumbnailUrl ?? item.url} alt="" className="size-full object-cover" loading="lazy" />
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* not overflow-hidden: the hover zoom's side view sits outside this box */}
                <div className="relative flex aspect-598/600 min-w-0 flex-1 self-start items-center justify-center">
                    {!current ? (
                        <div className="flex size-full items-center justify-center bg-[#ebebeb]">
                            <ImageOff className="size-8 text-neutral-400" />
                        </div>
                    ) : current.mediaType === "VIDEO" ? (
                        <video key={current.url} src={current.url} controls className="size-full bg-black object-contain" />
                    ) : (
                        <>
                            <LotImageZoom key={current.url} src={current.url} alt={current.caption ?? lotHeading(lot)} onOpen={() => setViewing(true)} />
                            <button
                                type="button"
                                onClick={() => setViewing(true)}
                                aria-label="Zoom artwork"
                                className="absolute top-2.5 right-3 flex size-8 cursor-pointer items-center justify-center border border-[#333] bg-white hover:bg-[#fdedd6]"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/icons/zoom-in.svg" alt="" width={16} height={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {viewing && (
                <LotLightbox
                    media={media}
                    startIndex={selected}
                    alt={lotHeading(lot)}
                    // land on whichever image was last viewed
                    onClose={(lastIndex) => {
                        setSelected(lastIndex)
                        setViewing(false)
                    }}
                />
            )}
        </div>
    )
}
