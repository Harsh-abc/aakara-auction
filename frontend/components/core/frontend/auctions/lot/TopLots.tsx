"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { PublicLot } from "@/lib/types/publicAuction.types";

import { EYEBROW, SectionHeading } from "../../storefront";
import { formatMoney, lotEstimate, lotHeading, lotHref } from "../detail/lotDisplay";
import { useGallery } from "../detail/useGallery";
import { LotStatusTag } from "./LotTag";
import { isClosedLot, isUpcomingLot, lotTag } from "./lotPageDisplay";
import type { OnBid } from "./BidButtons";

// Figma "Top lots by value" layout, listing the sale's lots in lot order: LOT | artist · title | current bid | status | actions
const ROW_GRID = "md:grid md:grid-cols-[96px_minmax(0,1fr)_156px_136px_240px] md:items-center md:px-5";
const ROW_BUTTON = "inline-flex h-9 cursor-pointer items-center justify-center border text-[12px] leading-4.5 tracking-[0.12em] uppercase transition-colors duration-200";

type TopLotsProps = {
    auctionUuid: string;
    lots: PublicLot[];
    /** "live", "upcoming"… — the sale's state, lowercased in the heading */
    saleStatus: string;
    onBid: OnBid;
};

export function TopLots({ auctionUuid, lots, saleStatus, onBid }: TopLotsProps) {
    const { controls: gallery } = useGallery();
    // lot 1, 2, 3…
    const ordered = [...lots].sort((a, b) => Number(a.itemNumber) - Number(b.itemNumber));

    return (
        <section aria-labelledby="top-lots-heading">
            <div className="page-container">
                <SectionHeading id="top-lots-heading" title="Lots in this sale" aside={`${lots.length} ${lots.length === 1 ? "lot" : "lots"} · ${saleStatus}`} />

                <div className="mt-6 border border-[#cecece]">
                    <div className={cn(ROW_GRID, EYEBROW, "hidden h-9.5 border-b border-[#cecece]")}>
                        <span>Lot</span>
                        <span>Artist · Work title</span>
                        <span>Current bid</span>
                        <span>Status</span>
                        <span aria-hidden />
                    </div>

                    <ul className="divide-y divide-[#cecece]">
                        {ordered.map((lot) => {
                            const estimate = lotEstimate(lot);
                            const bid = Number(lot.bidCount) > 0 ? formatMoney(lot.currentBid, lot.currency) : null;
                            const action = lot.status === "ACTIVE" ? "bid" : isUpcomingLot(lot) ? "proxy" : null;
                            const saved = gallery.isSaved(lot.uuid);

                            return (
                                <li key={lot.uuid} className={cn(ROW_GRID, "flex flex-col gap-3 p-4 md:min-h-17.5 md:gap-0 md:py-4")}>
                                    <span className="text-[10px] leading-3.75 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">{lotTag(lot)}</span>
                                    <div className="min-w-0 md:pr-6">
                                        <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{lotHeading(lot)}</p>
                                        {estimate && <p className={cn(EYEBROW, "mt-1")}>Estimate · {estimate}</p>}
                                        {!isClosedLot(lot) && (
                                            <button
                                                type="button"
                                                onClick={() => gallery.toggle(lot.uuid)}
                                                disabled={gallery.isPending(lot.uuid)}
                                                className="mt-3.5 cursor-pointer text-[11px] leading-3.75 tracking-[0.12em] text-[#0d0d0d] uppercase underline underline-offset-2 not-disabled:hover:text-[#673364] disabled:cursor-wait disabled:opacity-60"
                                            >
                                                {saved ? "In my auction gallery" : "Add to my auction gallery"}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{bid ?? "—"}</p>
                                    <div>
                                        <LotStatusTag lot={lot} />
                                    </div>
                                    <div className="flex gap-2">
                                        {action && (
                                            <button
                                                type="button"
                                                onClick={() => onBid(action, lot)}
                                                className={cn(ROW_BUTTON, "w-27.5 border-[#0d0d0d] bg-[#0d0d0d] text-white hover:border-[#673364] hover:bg-[#673364]")}
                                            >
                                                {action === "bid" ? "Place a bid" : "Proxy bid"}
                                            </button>
                                        )}
                                        <Link href={lotHref(auctionUuid, lot)} className={cn(ROW_BUTTON, "w-17.5 border-[#333] bg-white text-[#0d0d0d] hover:border-[#d0a55d] hover:bg-[#fdedd6]")}>
                                            View
                                        </Link>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </section>
    );
}
