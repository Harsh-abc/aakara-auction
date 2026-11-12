"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { getPublicLot, getPublicLots } from "@/services/operations/publicAuction.api";

import { lotDetailsHref } from "./lotDisplay";
import { roomLot } from "../lot/lotPageDisplay";

// the catalogue page of the lot on the block (else the next to come up), worked out on click
async function liveRoomHref(auctionUuid: string) {
    const { lots: firstPage } = await getPublicLots({ auctionUuid, page: 1, limit: 1 });
    if (!firstPage.length) return null;
    const { lots } = await getPublicLot(auctionUuid, firstPage[0].uuid);
    return lotDetailsHref(auctionUuid, roomLot(lots) ?? firstPage[0]);
}

// sits beside the lot controls while the sale is live — same 37px outline as the sort trigger
export function LiveRoomButton({ auctionUuid, className }: { auctionUuid: string; className?: string }) {
    const router = useRouter();
    const [pending, setPending] = useState(false);

    const open = async () => {
        if (pending) return;
        setPending(true);
        try {
            const href = await liveRoomHref(auctionUuid);
            if (href) router.push(href);
            else setPending(false);
        } catch {
            setPending(false);
        }
    };

    return (
        <button
            type="button"
            onClick={open}
            aria-busy={pending}
            aria-label="View the live lot"
            className={cn(
                "group inline-flex h-9.25 cursor-pointer items-center gap-2 border border-black bg-black px-3.25 text-[11px] leading-[13.2px] tracking-[0.16em] text-white uppercase transition-colors duration-200 outline-none hover:border-[#673364] hover:bg-[#673364] focus-visible:border-[#673364] focus-visible:bg-[#673364]",
                className,
            )}
        >
            <span className="relative flex size-1.5 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#d0a55d] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[#d0a55d]" />
            </span>
            Live
            <span className="text-white/60 transition-colors group-hover:text-white/80 group-focus-visible:text-white/80">· View Live Lot</span>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />}
        </button>
    );
}
