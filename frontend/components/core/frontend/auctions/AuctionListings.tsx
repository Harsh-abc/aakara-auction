"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import type { PublicAuctionsPage, PublicAuctionTab } from "@/lib/types/publicAuction.types"
import { getPublicAuctions } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "../profile/ProfileUI"

import type { BidderEligibility } from "./auctionDisplay"
import { AuctionListItem } from "./AuctionListItem"
import { SearchInput } from "./SearchInput"

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 350

const tabLabels: Record<PublicAuctionTab, string> = {
    upcoming: "Upcoming / Live",
    past: "Past",
}

const tabDescriptions: Record<PublicAuctionTab, string> = {
    upcoming: "Sales open for bidding right now, followed by those opening soon.",
    past: "Recently closed sales, newest first.",
}

const emptyCopy: Record<PublicAuctionTab, string> = {
    upcoming: "No sales are open or scheduled right now. Check back soon.",
    past: "No past sales yet.",
}

type ListingResult = PublicAuctionsPage & { key: string; error: string | null }

const EMPTY_PAGE: PublicAuctionsPage = {
    auctions: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 },
}

type AuctionListingsProps = {
    paddles: Record<string, string>
    eligibility: BidderEligibility
    onRegistered: (auctionUuid: string, paddleNumber: string) => void
}

export function AuctionListings({ paddles, eligibility, onRegistered }: AuctionListingsProps) {
    const [tab, setTab] = useState<PublicAuctionTab>("upcoming")
    const [searchInput, setSearchInput] = useState("")
    const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS)

    // results are tagged with the query they answer, so a stale tag means a fetch is in flight
    const queryKey = `${tab}|${search}`
    const [result, setResult] = useState<ListingResult | null>(null)
    const [loadingMore, setLoadingMore] = useState(false)

    const loading = result?.key !== queryKey
    const auctions = loading ? [] : result.auctions
    const { page = 1, totalPages = 0, total = 0 } = loading ? {} : result.pagination
    const error = loading ? null : result.error

    // first page whenever the tab or search changes; drop answers to superseded requests
    useEffect(() => {
        let cancelled = false

        getPublicAuctions({ type: tab, search, page: 1, limit: PAGE_SIZE })
            .then((data) => {
                if (!cancelled) setResult({ key: queryKey, ...data, error: null })
            })
            .catch((err) => {
                if (!cancelled) setResult({ key: queryKey, ...EMPTY_PAGE, error: getErrorMessage(err) })
            })

        return () => {
            cancelled = true
        }
    }, [tab, search, queryKey])

    const loadMore = async () => {
        setLoadingMore(true)
        try {
            const data = await getPublicAuctions({ type: tab, search, page: page + 1, limit: PAGE_SIZE })
            setResult((current) =>
                current?.key === queryKey
                    ? { ...current, auctions: [...current.auctions, ...data.auctions], pagination: data.pagination }
                    : current
            )
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setLoadingMore(false)
        }
    }

    return (
        <section id="auctions" className="scroll-mt-6">
            <header className="border-b border-neutral-200 pb-4">
                <h2 className="text-lg font-normal text-neutral-950">Upcoming &amp; Live Auctions</h2>
            </header>
            <p className="mt-4 text-xs text-neutral-500">{tabDescriptions[tab]}</p>

            <div className="mt-6 flex flex-col-reverse gap-4 border-b border-neutral-200 md:flex-row md:items-end md:justify-between">
                <Tabs value={tab} onValueChange={(value) => setTab(value as PublicAuctionTab)}>
                    <TabsList className="w-full justify-start rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                        {(Object.keys(tabLabels) as PublicAuctionTab[]).map((key) => (
                            <TabsTrigger
                                key={key}
                                value={key}
                                className="h-auto flex-none cursor-pointer rounded-none border-0 border-b-2 border-transparent px-5 py-3 text-[11px] font-normal uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900 data-active:border-[#C9A24B] data-active:bg-[#FBF4E6] data-active:text-neutral-900 group-data-[variant=default]/tabs-list:data-active:shadow-none"
                            >
                                {tabLabels[key]}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <SearchInput
                    value={searchInput}
                    onChange={setSearchInput}
                    label="Search auctions"
                    placeholder="Search by artist, title, lot number or keyword..."
                    className="mb-3 md:w-80"
                />
            </div>

            {search && !loading && !error && (
                <p className="mt-4 text-xs text-neutral-500">
                    {total} {total === 1 ? "sale" : "sales"} matching “{search}”
                </p>
            )}

            {loading ? (
                <div className="divide-y divide-neutral-200">
                    {[0, 1].map((i) => (
                        <div key={i} className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr_260px]">
                            <Skeleton className="aspect-4/5 w-full max-w-50 rounded-none sm:max-w-none" />
                            <div>
                                <Skeleton className="h-4 w-20 rounded-none" />
                                <Skeleton className="mt-4 h-6 w-56 rounded-none" />
                                <Skeleton className="mt-3 h-3 w-72 rounded-none" />
                                <Skeleton className="mt-5 h-12 w-full max-w-md rounded-none" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <p className="py-12 text-center text-sm text-neutral-500">{error}</p>
            ) : auctions.length === 0 ? (
                <p className="py-12 text-center text-sm text-neutral-500">
                    {search ? "No sales match your search. Try an artist, title or lot number." : emptyCopy[tab]}
                </p>
            ) : (
                <>
                    <div>
                        {auctions.map((auction) => (
                            <AuctionListItem
                                key={auction.uuid}
                                auction={auction}
                                paddleNumber={paddles[auction.uuid]}
                                eligibility={eligibility}
                                onRegistered={onRegistered}
                            />
                        ))}
                    </div>

                    {page < totalPages && (
                        <div className="flex justify-center pt-2">
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="h-11 cursor-pointer border border-neutral-950 bg-white px-8 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loadingMore ? "Loading..." : "Load more sales"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    )
}
