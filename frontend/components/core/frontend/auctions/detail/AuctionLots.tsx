"use client";

import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import type { PublicLotSort, PublicLotsPage } from "@/lib/types/publicAuction.types";
import { getPublicLots } from "@/services/operations/publicAuction.api";
import { getErrorMessage } from "@/lib/apiError";

import { BODY, EYEBROW } from "../../storefront";
import { SearchInput } from "../SearchInput";
import { LotCard, LotRow } from "./LotCard";
import { LotPagination } from "./LotPagination";
import { useGallery } from "./useGallery";

// Figma "All lots": two rows of three, then the pager
const LOTS_PER_PAGE = 6;

const SORT_LABELS: Record<PublicLotSort, string> = {
    lot: "Lot no.",
    "estimate-asc": "Estimate: low to high",
    "estimate-desc": "Estimate: high to low",
    "bid-desc": "Current bid: highest",
};

type ViewMode = "grid" | "list";

type LotsResult = PublicLotsPage & { key: string; error: string | null };

type AuctionLotsProps = {
    auctionUuid: string;
    /** sits opposite the search box (the sale countdown) */
    aside?: React.ReactNode;
};

export function AuctionLots({ auctionUuid, aside }: AuctionLotsProps) {
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput.trim());
    const [sort, setSort] = useState<PublicLotSort>("lot");
    const [view, setView] = useState<ViewMode>("grid");

    // a page only belongs to the search + sort it was picked under, so changing either starts at page 1
    const filterKey = `${search}|${sort}`;
    const [pageChoice, setPageChoice] = useState({ filterKey, page: 1 });
    const page = pageChoice.filterKey === filterKey ? pageChoice.page : 1;

    // results are tagged with the query they answer, so a stale tag means a fetch is in flight
    const queryKey = `${filterKey}|${page}`;
    const [result, setResult] = useState<LotsResult | null>(null);
    const loading = result?.key !== queryKey;

    const topRef = useRef<HTMLElement>(null);

    // "Add to my auction gallery" on each lot; guests are sent to log in
    const { controls: gallery } = useGallery();

    useEffect(() => {
        let cancelled = false;
        getPublicLots({ auctionUuid, search, sort, page, limit: LOTS_PER_PAGE })
            .then((data) => {
                if (!cancelled) setResult({ key: queryKey, ...data, error: null });
            })
            .catch((err) => {
                if (!cancelled)
                    setResult({
                        key: queryKey,
                        lots: [],
                        pagination: { page, limit: LOTS_PER_PAGE, total: 0, totalPages: 0 },
                        error: getErrorMessage(err),
                    });
            });
        return () => {
            cancelled = true;
        };
    }, [auctionUuid, search, sort, page, queryKey]);

    const goToPage = (next: number) => {
        setPageChoice({ filterKey, page: next });
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // the last answer stays on screen while the next page loads, so the grid doesn't jump
    const total = result?.pagination.total ?? 0;

    return (
        <>
            {/* search + the sale countdown */}
            <section>
                <div className="page-container flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <SearchInput value={searchInput} onChange={setSearchInput} label="Search lots" placeholder="Search by artist name, artwork title, lot number or keyword…" className="md:max-w-md" />
                    {aside}
                </div>
            </section>

            <section ref={topRef} aria-labelledby="all-lots-heading" className="scroll-mt-24">
                <div className="page-container">
                    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#cecece] pb-3.25">
                        <h2 id="all-lots-heading" className="flex items-baseline gap-2.5 text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">
                            All lots
                            <span className={EYEBROW}>{result ? `${total} ${total === 1 ? "lot" : "lots"}` : "—"}</span>
                        </h2>

                        <div className="flex items-center gap-3">
                            <label className="flex h-9.25 items-center gap-1.5 border border-[#cecece] bg-white pl-3.25 text-[11px] leading-[13.2px] tracking-[0.16em] uppercase">
                                <span className="text-[#717171]/70">Sort ·</span>
                                <select
                                    value={sort}
                                    onChange={(event) => setSort(event.target.value as PublicLotSort)}
                                    className="h-full cursor-pointer appearance-none bg-transparent pr-8 text-[11px] tracking-[0.16em] text-[#0d0d0d] uppercase outline-none"
                                >
                                    {(Object.keys(SORT_LABELS) as PublicLotSort[]).map((key) => (
                                        <option key={key} value={key}>
                                            {SORT_LABELS[key]}
                                        </option>
                                    ))}
                                </select>
                                <span aria-hidden className="pointer-events-none -ml-7 pr-3.25 text-[12px] text-[#717171]">
                                    ▾
                                </span>
                            </label>

                            <div className="flex border border-[#333]" role="group" aria-label="Layout">
                                {(["grid", "list"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setView(mode)}
                                        aria-pressed={view === mode}
                                        aria-label={mode === "grid" ? "Grid view" : "List view"}
                                        className={cn(
                                            "inline-flex size-9 cursor-pointer items-center justify-center transition-colors",
                                            view === mode ? "bg-[#0d0d0d]" : "bg-white hover:bg-[#f4f2ef]",
                                        )}
                                    >
                                        {/* the grid icon is drawn white, the list icon dark — flip whichever isn't in its own state */}
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={mode === "grid" ? "/icons/view-grid.svg" : "/icons/view-list.svg"}
                                            alt=""
                                            width={16}
                                            height={16}
                                            className={cn((mode === "grid") !== (view === mode) && "invert")}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {!result ? (
                        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }, (_, i) => (
                                <div key={i} className="border border-[#cecece] p-4">
                                    <Skeleton className="h-62.75 w-full rounded-none" />
                                    <Skeleton className="mt-4 h-3.75 w-16 rounded-none" />
                                    <Skeleton className="mt-4 h-5 w-40 rounded-none" />
                                    <Skeleton className="mt-1 h-3.5 w-32 rounded-none" />
                                    <Skeleton className="mt-4 h-11 w-full rounded-none" />
                                </div>
                            ))}
                        </div>
                    ) : result.error ? (
                        <p className={cn(BODY, "py-16 text-center")}>{result.error}</p>
                    ) : result.lots.length === 0 ? (
                        <p className={cn(BODY, "py-16 text-center")}>{search ? "No lots match your search. Try an artist, title or lot number." : "Lots for this sale will be published soon."}</p>
                    ) : (
                        <div className={cn("transition-opacity", loading && "pointer-events-none opacity-50")} aria-busy={loading}>
                            {view === "grid" ? (
                                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {result.lots.map((lot) => (
                                        <LotCard key={lot.uuid} lot={lot} auctionUuid={auctionUuid} gallery={gallery} />
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    {result.lots.map((lot) => (
                                        <LotRow key={lot.uuid} lot={lot} auctionUuid={auctionUuid} gallery={gallery} />
                                    ))}
                                </div>
                            )}

                            <div className="mt-8">
                                <LotPagination page={result.pagination.page} totalPages={result.pagination.totalPages} total={total} limit={result.pagination.limit} onPageChange={goToPage} />
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
