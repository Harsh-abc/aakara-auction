"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { PublicAuctionsPage, PublicAuctionTab } from "@/lib/types/publicAuction.types";
import { getPublicAuctions } from "@/services/operations/publicAuction.api";
import { getErrorMessage } from "../profile/ProfileUI";

import { AuctionListItem } from "./AuctionListItem";
import { SearchInput } from "./SearchInput";
import type { BidderEligibility } from "./auctionDisplay"
import { AuctionListItem } from "./AuctionListItem"
import { SearchInput } from "./SearchInput"

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

const tabLabels: Record<PublicAuctionTab, string> = {
    upcoming: "Upcoming / Live",
    past: "Past",
};

const tabDescriptions: Record<PublicAuctionTab, string> = {
    upcoming: "Sales open for bidding right now, followed by those opening soon.",
    past: "Recently closed sales, newest first.",
};

const emptyCopy: Record<PublicAuctionTab, string> = {
    upcoming: "No sales are open or scheduled right now. Check back soon.",
    past: "No past sales yet.",
};

type ListingResult = PublicAuctionsPage & { key: string; error: string | null };

const EMPTY_PAGE: PublicAuctionsPage = {
    auctions: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 },
};

// tab styling from the reference design: tinted background + gold underline on the active tab
const TAB_TRIGGER =
    "relative inline-flex h-10 flex-none shrink-0 cursor-pointer items-center whitespace-nowrap rounded-none border-0 bg-transparent px-4 text-[10px] font-normal uppercase tracking-[0.16em] text-[#717171] transition-colors duration-200 hover:text-[#0d0d0d] sm:px-5 " +
    "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-[#d0a55d] after:transition-transform after:duration-300 " +
    "data-active:bg-[#fdedd6] data-active:text-[#0d0d0d] data-active:after:scale-x-100 group-data-[variant=default]/tabs-list:data-active:shadow-none";

const LOAD_MORE =
    "inline-flex h-11 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-none border border-[#333] bg-white px-6 text-[12px] uppercase tracking-[0.12em] text-[#0d0d0d] transition-[background-color,border-color,color,transform] duration-200 ease-out hover:border-[#d0a55d] hover:bg-[#fdedd6] active:translate-y-px disabled:cursor-not-allowed disabled:border-[#a3a3a3] disabled:bg-[#a3a3a3] disabled:text-white";

type AuctionListingsProps = {
    paddles: Record<string, string>;
    onRegistered: (auctionUuid: string, paddleNumber: string) => void;
};

export function AuctionListings({ paddles, onRegistered }: AuctionListingsProps) {
    const [tab, setTab] = useState<PublicAuctionTab>("upcoming");
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
    paddles: Record<string, string>
    eligibility: BidderEligibility
    onRegistered: (auctionUuid: string, paddleNumber: string) => void
}

export function AuctionListings({ paddles, eligibility, onRegistered }: AuctionListingsProps) {
    const [tab, setTab] = useState<PublicAuctionTab>("upcoming")
    const [searchInput, setSearchInput] = useState("")
    const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS)

    // results are tagged with the query they answer, so a stale tag means a fetch is in flight
    const queryKey = `${tab}|${search}`;
    const [result, setResult] = useState<ListingResult | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const loading = result?.key !== queryKey;
    const auctions = loading ? [] : result.auctions;
    const { page = 1, totalPages = 0, total = 0 } = loading ? {} : result.pagination;
    const error = loading ? null : result.error;

    // first page whenever the tab or search changes; drop answers to superseded requests
    useEffect(() => {
        let cancelled = false;

        getPublicAuctions({ type: tab, search, page: 1, limit: PAGE_SIZE })
            .then((data) => {
                if (!cancelled) setResult({ key: queryKey, ...data, error: null });
            })
            .catch((err) => {
                if (!cancelled) setResult({ key: queryKey, ...EMPTY_PAGE, error: getErrorMessage(err) });
            });

        return () => {
            cancelled = true;
        };
    }, [tab, search, queryKey]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const data = await getPublicAuctions({ type: tab, search, page: page + 1, limit: PAGE_SIZE });
            setResult((current) => (current?.key === queryKey ? { ...current, auctions: [...current.auctions, ...data.auctions], pagination: data.pagination } : current));
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <section id="auctions" aria-labelledby="auction-list-heading" className="scroll-mt-24 pt-16">
            <div className="mb-8">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#cecece] pb-3">
                    <h2 className="text-lg font-normal text-[#0d0d0d]">
                        <span id="auction-list-heading">Upcoming &amp; Live Auctions</span>
                    </h2>
                </div>
                <p className="mt-3 text-[13px] text-[#717171]">{tabDescriptions[tab]}</p>
            </div>

            <div className="flex flex-col-reverse gap-4 border-b border-[#cecece] md:flex-row md:items-end md:justify-between">
                <Tabs value={tab} onValueChange={(value) => setTab(value as PublicAuctionTab)}>
                    <TabsList className="-mb-px h-auto w-full justify-start rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                        {(Object.keys(tabLabels) as PublicAuctionTab[]).map((key) => (
                            <TabsTrigger key={key} value={key} className={TAB_TRIGGER}>
                                {tabLabels[key]}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <SearchInput value={searchInput} onChange={setSearchInput} label="Search auctions" placeholder="Search by artist, title, lot number or keyword…" className="mb-3 md:max-w-74" />
            </div>

            {search && !loading && !error && (
                <p className="mt-4 text-[13px] text-[#717171]">
                    {total} {total === 1 ? "sale" : "sales"} matching “{search}”
                </p>
            )}

            {loading ? (
                <div>
                    {[0, 1].map((i) => (
                        <div key={i} className="grid gap-6 border-b border-[#e3e3e3] py-8 sm:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr_300px] lg:gap-10">
                            <Skeleton className="aspect-4/5 w-full max-w-50 rounded-none bg-[#f4f2ef]" />
                            <div className="min-w-0">
                                <Skeleton className="h-5.5 w-20 rounded-none" />
                                <Skeleton className="mt-3 h-6 w-56 rounded-none" />
                                <Skeleton className="mt-2 h-3 w-72 rounded-none" />
                                <Skeleton className="mt-4 h-12 w-full max-w-xl rounded-none" />
                            </div>
                            <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1 lg:items-end">
                                <Skeleton className="h-8 w-48 rounded-none" />
                                <Skeleton className="h-11 w-full rounded-none lg:mt-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <p className="py-12 text-center text-[13px] text-[#717171]">{error}</p>
            ) : auctions.length === 0 ? (
                <p className="py-12 text-center text-[13px] text-[#717171]">{search ? "No sales match your search. Try an artist, title or lot number." : emptyCopy[tab]}</p>
            ) : (
                <>
                    <div>
                        {auctions.map((auction) => (
                            <AuctionListItem key={auction.uuid} auction={auction} paddleNumber={paddles[auction.uuid]} onRegistered={onRegistered} />
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
                        <div className="flex justify-center pt-8">
                            <button type="button" onClick={loadMore} disabled={loadingMore} className={LOAD_MORE}>
                                {loadingMore ? "Loading..." : "Load more sales"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
