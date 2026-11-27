"use client";

import { Phone } from "lucide-react";

import type { AuctionConsole } from "@/lib/types/bidding.types";

import { money } from "./consoleDisplay";

interface PhoneBiddersProps {
    itemNumber: string;
    floorBidders: AuctionConsole["floorBidders"];
    leaderUuid: string | null;
    code: string;
}

// The live lot's phone bidders: those who picked this lot on Manage Bidders, in a purple box so the
// auctioneer knows whom to have on the line. Hidden when nobody is interested in the lot.
export default function PhoneBidders({ itemNumber, floorBidders, leaderUuid, code }: PhoneBiddersProps) {
    const interested = floorBidders.filter((bidder) => bidder.phoneInterest);
    if (interested.length === 0) return null;

    return (
        <section className="flex shrink-0 flex-col rounded-[8px] border border-purple-300 bg-purple-50 p-3 lg:max-h-48">
            <div className="flex items-start justify-between gap-2 px-1 pb-2">
                <div>
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-purple-800">
                        <Phone className="h-3.5 w-3.5" />
                        Phone Bidders · Lot #{itemNumber}
                    </p>
                    <p className="text-[10px] text-purple-700/80">Interested in this lot — bid for them with Place Bid</p>
                </div>
                <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-semibold text-white">{interested.length}</span>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {interested.map((bidder) => {
                    const leading = Boolean(leaderUuid && bidder.uuid === leaderUuid);
                    return (
                        <li
                            key={bidder.uuid ?? bidder.paddle}
                            className="flex items-center justify-between gap-2 rounded-[6px] border border-purple-200 bg-white px-2.5 py-1.5 text-[12px]"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-purple-700">#{bidder.paddle}</p>
                                <p className="truncate text-[11px] text-slate-600" title={bidder.name ?? undefined}>
                                    {bidder.name ?? "Verified bidder"}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                {leading && (
                                    <span className="rounded-[3px] bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-700 uppercase">
                                        Leading
                                    </span>
                                )}
                                {bidder.proxyMax && (
                                    <p className="mt-0.5 text-[10px] text-[#7b365d]">Proxy up to {money(bidder.proxyMax, code)}</p>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
