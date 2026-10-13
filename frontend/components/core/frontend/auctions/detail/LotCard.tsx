import Link from "next/link"
import { Check, ImageOff, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PublicLot } from "@/lib/types/publicAuction.types"

import { LotBadge } from "./LotBadge"
import { lotBidLine, lotDetails, lotEstimate, lotHeading, lotHref, lotNumber } from "./lotDisplay"
import type { GalleryControls } from "./useGallery"

const VIEW_BUTTON =
    "inline-flex h-9 items-center justify-center bg-neutral-950 px-5 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800"

function LotImage({ lot, className }: { lot: PublicLot; className?: string }) {
    return (
        <div className={cn("flex items-center justify-center overflow-hidden bg-neutral-50", className)}>
            {lot.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lot.image} alt={lotHeading(lot)} className="h-full w-full object-contain" loading="lazy" />
            ) : (
                <ImageOff className="size-6 text-neutral-300" />
            )}
        </div>
    )
}

function LotText({ lot }: { lot: PublicLot }) {
    const details = lotDetails(lot)
    const estimate = lotEstimate(lot)

    return (
        <>
            <h3 className="text-sm text-neutral-950">{lotHeading(lot)}</h3>
            {details && <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-neutral-500">{details}</p>}
            <div className="mt-3 border-t border-neutral-200 pt-3">
                {estimate && (
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Estimate · {estimate}</p>
                )}
                <p className="mt-1 text-sm text-neutral-950">{lotBidLine(lot)}</p>
            </div>
        </>
    )
}

// "+ Add to my auction gallery" / "✓ In my auction gallery"
function GalleryButton({ lot, gallery, className }: { lot: PublicLot; gallery: GalleryControls; className?: string }) {
    const saved = gallery.isSaved(lot.uuid)
    const pending = gallery.isPending(lot.uuid)

    return (
        <button
            type="button"
            onClick={() => gallery.toggle(lot.uuid)}
            disabled={pending}
            aria-pressed={saved}
            title={saved ? "Remove from my auction gallery" : "Add to my auction gallery"}
            className={cn(
                "inline-flex h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 border px-3 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors disabled:cursor-wait disabled:opacity-60",
                saved
                    ? "border-neutral-950 bg-neutral-100 text-neutral-950 hover:bg-neutral-200"
                    : "border-neutral-950 bg-white text-neutral-950 hover:bg-neutral-50",
                className
            )}
        >
            {saved ? <Check className="size-3 shrink-0" /> : <Plus className="size-3 shrink-0" />}
            <span className="truncate">{saved ? "In my auction gallery" : "Add to my auction gallery"}</span>
        </button>
    )
}

/** gallery: when passed, the lot gets the "Add to my auction gallery" button next to View */
type LotProps = { lot: PublicLot; auctionUuid: string; gallery?: GalleryControls }

export function LotCard({ lot, auctionUuid, gallery }: LotProps) {
    return (
        <article className="flex flex-col border border-neutral-200 bg-white p-4">
            <LotImage lot={lot} className="aspect-square" />
            <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-950">{lotNumber(lot)}</span>
                <LotBadge lot={lot} />
            </div>
            <div className="mt-3 flex-1">
                <LotText lot={lot} />
            </div>
            <div className="mt-4 flex gap-2">
                {gallery && <GalleryButton lot={lot} gallery={gallery} className="flex-1" />}
                <Link href={lotHref(auctionUuid, lot)} className={cn(VIEW_BUTTON, gallery ? "shrink-0" : "w-full")}>
                    View
                </Link>
            </div>
        </article>
    )
}

export function LotRow({ lot, auctionUuid, gallery }: LotProps) {
    return (
        <article className="grid grid-cols-[96px_1fr] gap-4 border-b border-neutral-200 py-5 sm:grid-cols-[120px_1fr_auto] sm:items-center sm:gap-6">
            <LotImage lot={lot} className="aspect-square" />
            <div className="min-w-0">
                <div className="mb-2 flex items-center gap-3">
                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-950">{lotNumber(lot)}</span>
                    <LotBadge lot={lot} />
                </div>
                <LotText lot={lot} />
            </div>
            <div className="col-span-2 flex gap-2 sm:col-span-1 sm:w-56 sm:flex-col">
                {gallery && <GalleryButton lot={lot} gallery={gallery} className="flex-1 sm:flex-none" />}
                <Link href={lotHref(auctionUuid, lot)} className={cn(VIEW_BUTTON, gallery ? "shrink-0" : "flex-1")}>
                    View
                </Link>
            </div>
        </article>
    )
}
