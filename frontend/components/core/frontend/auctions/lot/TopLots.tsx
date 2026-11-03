"use client";

import { useState } from "react";
import Link from "next/link";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicLot } from "@/lib/types/publicAuction.types";

import { EYEBROW, SectionHeading } from "../../storefront";
import { AuctionCountdown } from "../AuctionCountdown";
import { SearchInput } from "../SearchInput";
import { formatMoney, lotEstimate, lotHeading, lotHref } from "../detail/lotDisplay";
import { useGallery } from "../detail/useGallery";
import { LotStatusTag } from "./LotTag";
import { isClosedLot, isUpcomingLot, lotTag } from "./lotPageDisplay";
import type { OnBid } from "./BidButtons";

// Figma "Top lots by value": LOT | artist · title | current bid | status | actions
const ROW_GRID = "md:grid md:grid-cols-[96px_minmax(0,1fr)_156px_136px_240px] md:items-center md:px-5";
const ROW_LINK = "cursor-pointer text-[11px] leading-4 tracking-[0.16em] text-[#0d0d0d] uppercase transition-colors duration-200 hover:text-[#673364]";

// the table shows the top ten of whatever the search and sort leave
const SHOWN = 10;

type LotOrder = "value-desc" | "value-asc" | "estimate-desc" | "estimate-asc";

const ORDER_LABELS: Record<LotOrder, string> = {
    "value-desc": "Value: high to low",
    "value-asc": "Value: low to high",
    "estimate-desc": "Estimate: high to low",
    "estimate-asc": "Estimate: low to high",
};

// what a lot is worth to the sort: its current bid (0 before the first bid), or its high estimate
const lotValue = (lot: PublicLot) => (Number(lot.bidCount) > 0 ? Number(lot.currentBid) || 0 : 0);
const lotEstimateValue = (lot: PublicLot) => Number(lot.estimateHigh ?? lot.estimateLow) || 0;

function sortLots(lots: PublicLot[], order: LotOrder) {
    const measure = order.startsWith("value") ? lotValue : lotEstimateValue;
    const direction = order.endsWith("desc") ? -1 : 1;
    // ties (e.g. no bids yet) stay in lot order
    return [...lots].sort((a, b) => direction * (measure(a) - measure(b)) || Number(a.itemNumber) - Number(b.itemNumber));
}

function matchesSearch(lot: PublicLot, search: string) {
    if (!search) return true;
    const needle = search.toLowerCase();
    return [lot.artistName, lot.title, lot.itemNumber, lotTag(lot)].some((field) => field?.toLowerCase().includes(needle));
}

// "By estimate" / "By value": each opens its two directions; the one in use holds the sort
function OrderSelect({ label, options, order, onChange }: { label: string; options: LotOrder[]; order: LotOrder; onChange: (order: LotOrder) => void }) {
    const active = options.includes(order);

    return (
        <Select.Root value={active ? order : null} onValueChange={(value) => value && onChange(value as LotOrder)}>
            <Select.Trigger
                aria-label={`Sort ${label.toLowerCase()}`}
                className={cn(
                    "flex h-10 w-full cursor-pointer items-center justify-between gap-3 border bg-white px-4 text-[12px] leading-4.5 tracking-[0.08em] text-[#0d0d0d] uppercase outline-none hover:border-[#0d0d0d] focus-visible:border-[#0d0d0d] data-popup-open:border-[#0d0d0d] md:w-68.5",
                    active ? "border-[#0d0d0d]" : "border-[#cecece]",
                )}
            >
                <span>{label}</span>
                <Select.Icon className="text-[#0d0d0d]">
                    <ChevronDown className="size-3.5" />
                </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Positioner side="bottom" align="start" sideOffset={4} alignItemWithTrigger={false} className="z-50 outline-none">
                    <Select.Popup className="min-w-(--anchor-width) border border-[#cecece] bg-white py-1 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.35)] outline-none">
                        <Select.List>
                            {options.map((option) => (
                                <Select.Item
                                    key={option}
                                    value={option}
                                    className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 text-[11px] leading-[13.2px] tracking-[0.16em] whitespace-nowrap text-[#717171] uppercase outline-none select-none data-highlighted:bg-[#f4f2ef] data-highlighted:text-[#0d0d0d] data-selected:text-[#0d0d0d]"
                                >
                                    <Select.ItemText>{ORDER_LABELS[option]}</Select.ItemText>
                                    <Select.ItemIndicator>
                                        <Check className="size-3.5" />
                                    </Select.ItemIndicator>
                                </Select.Item>
                            ))}
                        </Select.List>
                    </Select.Popup>
                </Select.Positioner>
            </Select.Portal>
        </Select.Root>
    );
}

type TopLotsProps = {
    auctionUuid: string;
    lots: PublicLot[];
    /** "live", "upcoming"… — the sale's state, lowercased in the count line */
    saleStatus: string;
    /** the sale's countdown; null once it has closed */
    countdown: { label: string; target: string } | null;
    onBid: OnBid;
};

export function TopLots({ auctionUuid, lots, saleStatus, countdown, onBid }: TopLotsProps) {
    const { controls: gallery } = useGallery();
    const [search, setSearch] = useState("");
    const [order, setOrder] = useState<LotOrder>("value-desc");

    const shown = sortLots(
        lots.filter((lot) => matchesSearch(lot, search.trim())),
        order,
    ).slice(0, SHOWN);

    return (
        <section aria-labelledby="top-lots-heading" className="md:pt-3">
            <div className="page-container">
                {/* the sale at a glance, then search + sort for the table */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <p className={EYEBROW}>
                        {lots.length} {lots.length === 1 ? "lot" : "lots"} · {shown.length} shown · {saleStatus}
                    </p>
                    {countdown ? <AuctionCountdown label={countdown.label} target={countdown.target} className="shrink-0" /> : <span className={EYEBROW}>Sale closed</span>}
                </div>

                <div className="mt-4 flex flex-col gap-3 border border-[#cecece] bg-white p-4 md:flex-row md:items-center">
                    <SearchInput value={search} onChange={setSearch} label="Search lots" placeholder="Search by artist name, artwork title, lot number or keyword…" className="md:max-w-112" />
                    <OrderSelect label="By estimate" options={["estimate-desc", "estimate-asc"]} order={order} onChange={setOrder} />
                    <OrderSelect label="By value" options={["value-desc", "value-asc"]} order={order} onChange={setOrder} />
                </div>

                <SectionHeading id="top-lots-heading" title="Top lots by value" className="mt-16" />

                <div className="mt-6 border border-[#cecece]">
                    <div className={cn(ROW_GRID, EYEBROW, "hidden h-9.5 border-b border-[#cecece]")}>
                        <span>Lot</span>
                        <span>Artist · Work title</span>
                        <span>Current bid</span>
                        <span>Status</span>
                        <span aria-hidden />
                    </div>

                    {shown.length === 0 ? (
                        <p className="px-5 py-6 text-[14px] leading-5 text-[#717171]">No lots match your search.</p>
                    ) : (
                        <ul className="divide-y divide-[#cecece]">
                            {shown.map((lot) => {
                                const estimate = lotEstimate(lot);
                                const bid = Number(lot.bidCount) > 0 ? formatMoney(lot.currentBid, lot.currency) : null;
                                const action = lot.status === "ACTIVE" ? "bid" : isUpcomingLot(lot) ? "proxy" : null;
                                const saved = gallery.isSaved(lot.uuid);

                                return (
                                    <li key={lot.uuid} className={cn(ROW_GRID, "flex flex-col gap-3 p-4 md:min-h-17.5 md:gap-0 md:py-4")}>
                                        <span className="text-[11px] leading-[13.2px] font-semibold tracking-[0.16em] text-[#0d0d0d] uppercase">{lotTag(lot)}</span>
                                        <div className="min-w-0 md:pr-6">
                                            <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{lotHeading(lot)}</p>
                                            {estimate && <p className={cn(EYEBROW, "mt-1")}>Estimate · {estimate}</p>}
                                            {!isClosedLot(lot) && (
                                                <button
                                                    type="button"
                                                    onClick={() => gallery.toggle(lot.uuid)}
                                                    disabled={gallery.isPending(lot.uuid)}
                                                    className="mt-3.5 cursor-pointer text-[12px] leading-4 tracking-[0.12em] text-[#0d0d0d] uppercase underline underline-offset-2 not-disabled:hover:text-[#673364] disabled:cursor-wait disabled:opacity-60"
                                                >
                                                    {saved ? "In my auction gallery" : "Add to my auction gallery"}
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{bid ?? "—"}</p>
                                        <div>
                                            <LotStatusTag lot={lot} className="h-5.5 gap-1.5 px-2.5" />
                                        </div>
                                        <div className="flex items-center gap-5">
                                            {action && (
                                                <button type="button" onClick={() => onBid(action, lot)} className={ROW_LINK}>
                                                    Place a bid
                                                </button>
                                            )}
                                            <Link href={lotHref(auctionUuid, lot)} className={cn(ROW_LINK, "underline underline-offset-2")}>
                                                View
                                            </Link>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
