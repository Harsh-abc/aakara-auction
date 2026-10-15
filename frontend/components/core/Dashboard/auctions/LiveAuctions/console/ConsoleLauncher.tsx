"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Gavel, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { getLiveAuctions } from "@/services/operations/auction.api";

import AuctionConsole from "./AuctionConsole";

// Sidebar entry for the console: opens the running sale's console, with a
// switcher when more than one sale is live at a time
export default function ConsoleLauncher() {
    const dispatch = useAppDispatch();
    const { liveAuctions, liveAuctionsLoading, liveAuctionsError } = useAppSelector((state) => state.auction);

    const [pickedUuid, setPickedUuid] = useState<string | null>(null);
    const selected = liveAuctions.find((a) => a.uuid === pickedUuid) ?? liveAuctions[0] ?? null;

    useEffect(() => {
        dispatch(getLiveAuctions());
    }, [dispatch]);

    if (liveAuctionsError && liveAuctions.length === 0) {
        return (
            <div className="mx-8 my-6 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {liveAuctionsError}
                </span>
                <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => dispatch(getLiveAuctions())}>
                    Retry
                </Button>
            </div>
        );
    }

    if (!selected) {
        return liveAuctionsLoading ? (
            <div className="mx-8 my-6 h-160 animate-pulse rounded-[8px] bg-slate-100" />
        ) : (
            <div className="mx-8 my-6 flex min-h-100 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-6 py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <Gavel className="h-7 w-7 text-gray-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-[#414141]">No Live Auctions Right Now</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                    The bidding console opens once an auction is live. Set an auction&apos;s status to Live from the
                    Auction Campaigns page to run it here.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                    <Radio className="h-3.5 w-3.5" />
                    <span>Live bidding is currently inactive</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {liveAuctions.length > 1 && (
                <div className="mx-8 mt-6 flex flex-wrap items-center gap-2">
                    <span className="text-[12px] text-slate-500">Live sales:</span>
                    {liveAuctions.map((auction) => (
                        <button
                            key={auction.uuid}
                            type="button"
                            onClick={() => setPickedUuid(auction.uuid)}
                            className={cn(
                                "inline-flex max-w-64 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors",
                                auction.uuid === selected.uuid
                                    ? "border-[#E5A000] bg-[#FFF8E6] font-medium text-[#414141]"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-[#E5A000]"
                            )}
                        >
                            <span
                                className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    auction.status === "LIVE" ? "animate-pulse bg-[#00865A]" : "bg-amber-500"
                                )}
                            />
                            <span className="truncate" title={auction.title}>
                                {auction.title}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* fresh console per sale, so nothing carries over between auctions */}
            <AuctionConsole key={selected.uuid} auctionUuid={selected.uuid} />
        </div>
    );
}
