"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { PublicAuctionsPage, PublicAuctionTab } from "@/lib/types/publicAuction.types";
import { getPublicAuctions } from "@/services/operations/publicAuction.api";
import { getErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, SectionHeading } from "../storefront";
import type { BidderEligibility } from "./auctionDisplay";
import { AuctionListItem, ROW_GRID } from "./AuctionListItem";
import { SearchInput } from "./SearchInput";

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

// Figma tabs: tinted fill + gold underline on the active tab
const TAB_TRIGGER =
    "relative inline-flex h-10.25 flex-none shrink-0 cursor-pointer items-center whitespace-nowrap rounded-none border-0 bg-transparent px-5 text-[12px] leading-4 font-normal tracking-[0.14em] text-[#717171] uppercase transition-colors duration-200 hover:text-[#0d0d0d] " +
    "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-[#cea25a] after:transition-transform after:duration-300 " +
    "data-active:bg-[#fbe4c8]/50 data-active:font-medium data-active:text-[#0d0d0d] data-active:after:scale-x-100 group-data-[variant=default]/tabs-list:data-active:shadow-none";

type AuctionListingsProps = {
    paddles: Record<string, string>;
    eligibility: BidderEligibility;
    onRegistered: (auctionUuid: string, paddleNumber: string) => void;
};

// "?tab=past" (menu / footer links) opens the past sales; anything else the upcoming / live ones
const tabFromUrl = (value: string | null): PublicAuctionTab => (value === "past" ? "past" : "upcoming");

export function AuctionListings({ paddles, eligibility, onRegistered }: AuctionListingsProps) {
    const searchParams = useSearchParams();
    const urlTab = tabFromUrl(searchParams.get("tab"));
    const [tab, setTab] = useState<PublicAuctionTab>(urlTab);

    // follow the URL when a menu link changes ?tab= while this page is already open
    const [seenUrlTab, setSeenUrlTab] = useState(urlTab);
    if (urlTab !== seenUrlTab) {
        setSeenUrlTab(urlTab);
        setTab(urlTab);
    }

    // clicking a tab writes it to the URL (no server round-trip), so a later menu link to the other tab still switches
    const changeTab = (value: PublicAuctionTab) => {
        setTab(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value === "upcoming") params.delete("tab");
        else params.set("tab", value);
        const query = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    };
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);

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
        <section id="auctions" aria-labelledby="auction-list-heading" className="scroll-mt-24">
            <div className="page-container">
                <SectionHeading id="auction-list-heading" title="Upcoming & Live Auctions" description={tabDescriptions[tab]} />

                <div className="mt-6 flex flex-col-reverse gap-4 border-b border-[#cecece] md:flex-row md:items-end md:justify-between">
                    <Tabs value={tab} onValueChange={(value) => changeTab(value as PublicAuctionTab)}>
                        <TabsList className="-mb-px h-auto w-full justify-start rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                            {(Object.keys(tabLabels) as PublicAuctionTab[]).map((key) => (
                                <TabsTrigger key={key} value={key} className={TAB_TRIGGER}>
                                    {tabLabels[key]}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <SearchInput value={searchInput} onChange={setSearchInput} label="Search auctions" placeholder="Search by artist, title, lot number or keyword…" className="md:mb-2 md:max-w-md" />
                </div>

                {search && !loading && !error && (
                    <p className={cn(BODY, "mt-6")}>
                        {total} {total === 1 ? "sale" : "sales"} matching “{search}”
                    </p>
                )}

                {loading ? (
                    <div>
                        {[0, 1].map((i) => (
                            <div key={i} className={ROW_GRID}>
                                <Skeleton className="h-52.5 w-full rounded-none bg-[#f4f2ef]" />
                                <div className="min-w-0">
                                    <Skeleton className="h-5.75 w-20 rounded-none" />
                                    <Skeleton className="mt-3.5 h-7 w-56 rounded-none" />
                                    <Skeleton className="mt-2 h-3.5 w-72 rounded-none" />
                                    <Skeleton className="mt-4 h-17 w-full rounded-none" />
                                </div>
                                <div className="flex flex-col justify-end gap-2">
                                    <Skeleton className="h-11 w-full rounded-none" />
                                    <Skeleton className="h-11 w-full rounded-none" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <p className={cn(BODY, "py-12 text-center")}>{error}</p>
                ) : auctions.length === 0 ? (
                    <p className={cn(BODY, "py-12 text-center")}>{search ? "No sales match your search. Try an artist, title or lot number." : emptyCopy[tab]}</p>
                ) : (
                    <>
                        <div>
                            {auctions.map((auction) => (
                                <AuctionListItem key={auction.uuid} auction={auction} paddleNumber={paddles[auction.uuid]} eligibility={eligibility} onRegistered={onRegistered} />
                            ))}
                        </div>

                        {page < totalPages && (
                            <div className="flex justify-center pt-6">
                                <button type="button" onClick={loadMore} disabled={loadingMore} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}>
                                    {loadingMore ? "Loading..." : "Load more sales"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
