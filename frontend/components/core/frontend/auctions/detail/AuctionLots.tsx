"use client"

import { useEffect, useRef, useState } from "react"
import { LayoutGrid, List } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { cn } from "@/lib/utils"
import type { PublicLotSort, PublicLotsPage } from "@/lib/types/publicAuction.types"
import { getPublicLots } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "../../profile/ProfileUI"

import { SearchInput } from "../SearchInput"
import { LotCard, LotRow } from "./LotCard"
import { LotPagination } from "./LotPagination"

const LOTS_PER_PAGE = 12

const SORT_LABELS: Record<PublicLotSort, string> = {
    lot: "Lot no.",
    "estimate-asc": "Estimate: low to high",
    "estimate-desc": "Estimate: high to low",
    "bid-desc": "Current bid: highest",
}

type ViewMode = "grid" | "list"

type LotsResult = PublicLotsPage & { key: string; error: string | null }

type AuctionLotsProps = {
    auctionUuid: string
    /** sits opposite the search box (the sale countdown) */
    aside?: React.ReactNode
}

export function AuctionLots({ auctionUuid, aside }: AuctionLotsProps) {
    const [searchInput, setSearchInput] = useState("")
    const search = useDebouncedValue(searchInput.trim())
    const [sort, setSort] = useState<PublicLotSort>("lot")
    const [view, setView] = useState<ViewMode>("grid")

    // a page only belongs to the search + sort it was picked under, so changing either starts at page 1
    const filterKey = `${search}|${sort}`
    const [pageChoice, setPageChoice] = useState({ filterKey, page: 1 })
    const page = pageChoice.filterKey === filterKey ? pageChoice.page : 1

    // results are tagged with the query they answer, so a stale tag means a fetch is in flight
    const queryKey = `${filterKey}|${page}`
    const [result, setResult] = useState<LotsResult | null>(null)
    const loading = result?.key !== queryKey

    const topRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let cancelled = false
        getPublicLots({ auctionUuid, search, sort, page, limit: LOTS_PER_PAGE })
            .then((data) => {
                if (!cancelled) setResult({ key: queryKey, ...data, error: null })
            })
            .catch((err) => {
                if (!cancelled)
                    setResult({
                        key: queryKey,
                        lots: [],
                        pagination: { page, limit: LOTS_PER_PAGE, total: 0, totalPages: 0 },
                        error: getErrorMessage(err),
                    })
            })
        return () => {
            cancelled = true
        }
    }, [auctionUuid, search, sort, page, queryKey])

    const goToPage = (next: number) => {
        setPageChoice({ filterKey, page: next })
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    // the last answer stays on screen while the next page loads, so the grid doesn't jump
    const total = result?.pagination.total ?? 0

    return (
        <>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <SearchInput
                    value={searchInput}
                    onChange={setSearchInput}
                    label="Search lots"
                    placeholder="Search by artist name, artwork title, lot number or keyword..."
                    className="md:max-w-sm"
                />
                {aside}
            </div>

            <section ref={topRef} className="mt-14 scroll-mt-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-3">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-base text-neutral-950">All lots</h2>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                            {result ? `${total} ${total === 1 ? "lot" : "lots"}` : "—"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex h-8 items-center gap-2 border border-neutral-300 pl-3 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                            Sort ·
                            <select
                                value={sort}
                                onChange={(event) => setSort(event.target.value as PublicLotSort)}
                                className="h-full cursor-pointer bg-transparent pr-2 text-[10px] uppercase tracking-[0.16em] text-neutral-950 outline-none"
                            >
                                {(Object.keys(SORT_LABELS) as PublicLotSort[]).map((key) => (
                                    <option key={key} value={key}>
                                        {SORT_LABELS[key]}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="flex" role="group" aria-label="Layout">
                            {(["grid", "list"] as const).map((mode) => {
                                const Icon = mode === "grid" ? LayoutGrid : List
                                return (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setView(mode)}
                                        aria-pressed={view === mode}
                                        aria-label={mode === "grid" ? "Grid view" : "List view"}
                                        className={cn(
                                            "inline-flex size-8 cursor-pointer items-center justify-center border -ml-px first:ml-0",
                                            view === mode
                                                ? "border-neutral-950 bg-neutral-950 text-white"
                                                : "border-neutral-300 text-neutral-600 hover:text-neutral-950"
                                        )}
                                    >
                                        <Icon className="size-3.5" />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {!result ? (
                    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} className="border border-neutral-200 p-4">
                                <Skeleton className="aspect-square w-full rounded-none" />
                                <Skeleton className="mt-4 h-3 w-16 rounded-none" />
                                <Skeleton className="mt-3 h-4 w-40 rounded-none" />
                                <Skeleton className="mt-2 h-3 w-32 rounded-none" />
                                <Skeleton className="mt-4 h-9 w-full rounded-none" />
                            </div>
                        ))}
                    </div>
                ) : result.error ? (
                    <p className="py-16 text-center text-sm text-neutral-500">{result.error}</p>
                ) : result.lots.length === 0 ? (
                    <p className="py-16 text-center text-sm text-neutral-500">
                        {search ? "No lots match your search. Try an artist, title or lot number." : "Lots for this sale will be published soon."}
                    </p>
                ) : (
                    <div className={cn("transition-opacity", loading && "pointer-events-none opacity-50")} aria-busy={loading}>
                        {view === "grid" ? (
                            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {result.lots.map((lot) => (
                                    <LotCard key={lot.uuid} lot={lot} auctionUuid={auctionUuid} />
                                ))}
                            </div>
                        ) : (
                            <div className="mt-2">
                                {result.lots.map((lot) => (
                                    <LotRow key={lot.uuid} lot={lot} auctionUuid={auctionUuid} />
                                ))}
                            </div>
                        )}

                        <div className="mt-10">
                            <LotPagination
                                page={result.pagination.page}
                                totalPages={result.pagination.totalPages}
                                total={total}
                                limit={result.pagination.limit}
                                onPageChange={goToPage}
                            />
                        </div>
                    </div>
                )}
            </section>
        </>
    )
}
