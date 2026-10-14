import Link from "next/link";
import { Check, ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicLot } from "@/lib/types/publicAuction.types";

import { BUTTON, BUTTON_SOLID, EYEBROW } from "../../storefront";
import { LotBadge } from "./LotBadge";
import { lotBidLine, lotDetails, lotEstimate, lotHeading, lotHref, lotNumber } from "./lotDisplay";
import type { GalleryControls } from "./useGallery";

// Figma "All lots" card: 16px inset, 251px image well, 44px actions
const VIEW_BUTTON = cn(BUTTON, BUTTON_SOLID, "w-19.5 shrink-0");

function LotImage({ lot, className }: { lot: PublicLot; className?: string }) {
    return (
        <div className={cn("flex items-center justify-center overflow-hidden bg-white", className)}>
            {lot.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lot.image} alt={lotHeading(lot)} className="h-full w-full object-contain" loading="lazy" />
            ) : (
                <ImageOff className="size-6 text-[#cecece]" />
            )}
        </div>
    );
}

function LotNumberLine({ lot }: { lot: PublicLot }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] leading-3.75 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">{lotNumber(lot)}</span>
            <LotBadge lot={lot} />
        </div>
    );
}

function LotText({ lot }: { lot: PublicLot }) {
    const details = lotDetails(lot);
    const estimate = lotEstimate(lot);

    return (
        <>
            <h3 className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{lotHeading(lot)}</h3>
            {details && <p className={cn(EYEBROW, "mt-1")}>{details}</p>}
            <div className="mt-4 flex flex-col gap-1 border-t border-[#cecece] pt-3.25">
                {estimate && <p className={EYEBROW}>Estimate · {estimate}</p>}
                <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{lotBidLine(lot)}</p>
            </div>
        </>
    );
}

// "+ Add to my auction gallery" / "✓ In my auction gallery"
function GalleryButton({ lot, gallery, className }: { lot: PublicLot; gallery: GalleryControls; className?: string }) {
    const saved = gallery.isSaved(lot.uuid);
    const pending = gallery.isPending(lot.uuid);

    return (
        <button
            type="button"
            onClick={() => gallery.toggle(lot.uuid)}
            disabled={pending}
            aria-pressed={saved}
            title={saved ? "Remove from my auction gallery" : "Add to my auction gallery"}
            className={cn(
                "inline-flex h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 border border-[#333] px-3.25 text-[11px] leading-[16.5px] tracking-[0.12em] text-[#0d0d0d] uppercase transition-colors duration-200 hover:border-[#d0a55d] hover:bg-[#fdedd6] disabled:cursor-wait disabled:opacity-60",
                saved ? "bg-[#fdedd6]" : "bg-white",
                className,
            )}
        >
            {saved ? <Check className="size-3 shrink-0" /> : <span aria-hidden>+</span>}
            <span className="truncate">{saved ? "In my auction gallery" : "Add to my auction gallery"}</span>
        </button>
    );
}

/** gallery: when passed, the lot gets the "Add to my auction gallery" button next to View */
type LotProps = { lot: PublicLot; auctionUuid: string; gallery?: GalleryControls };

export function LotCard({ lot, auctionUuid, gallery }: LotProps) {
    return (
        <article className="flex flex-col border border-[#cecece] bg-white p-4">
            <LotImage lot={lot} className="h-62.75" />
            <div className="mt-4">
                <LotNumberLine lot={lot} />
            </div>
            <div className="mt-4 flex-1">
                <LotText lot={lot} />
            </div>
            <div className="mt-4 flex gap-2">
                {gallery && <GalleryButton lot={lot} gallery={gallery} className="flex-1" />}
                <Link href={lotHref(auctionUuid, lot)} className={cn(VIEW_BUTTON, !gallery && "w-full")}>
                    View
                </Link>
            </div>
        </article>
    );
}

export function LotRow({ lot, auctionUuid, gallery }: LotProps) {
    return (
        <article className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-[#cecece] py-6 sm:grid-cols-[160px_minmax(0,1fr)_280px] sm:items-center sm:gap-6">
            <LotImage lot={lot} className="h-30 sm:h-40" />
            <div className="min-w-0">
                <div className="mb-4">
                    <LotNumberLine lot={lot} />
                </div>
                <LotText lot={lot} />
            </div>
            <div className="col-span-2 flex gap-2 sm:col-span-1">
                {gallery && <GalleryButton lot={lot} gallery={gallery} className="flex-1" />}
                <Link href={lotHref(auctionUuid, lot)} className={cn(VIEW_BUTTON, !gallery && "flex-1")}>
                    View
                </Link>
            </div>
        </article>
    );
}
