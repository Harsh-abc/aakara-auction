"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

import { Skeleton } from "@/components/ui/skeleton";
import type { PublicAuction } from "@/lib/types/publicAuction.types";
import { getPublicAuction } from "@/services/operations/publicAuction.api";
import { getErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { htmlToPlainText } from "@/utils/sanitizeHtml";

import { BODY, Breadcrumb, BUTTON, BUTTON_INLINE, BUTTON_SOLID, EYEBROW, PAGE_MAIN, PAGE_TITLE } from "../../storefront";
import { AuctionCountdown } from "../AuctionCountdown";
import { auctionMeta, isLive, STOREFRONT_STATUS_LABELS } from "../auctionDisplay";
import { AuctionLots } from "./AuctionLots";

type AuctionState = { status: "loading" } | { status: "ready"; auction: PublicAuction } | { status: "not-found" } | { status: "error"; message: string };

// counts to the close while the sale is live, to the opening before that
export function saleCountdown(auction: PublicAuction) {
    if (isLive(auction)) return { label: "Closes in", target: auction.endTime };
    if (auction.status === "SCHEDULED" || auction.status === "PREVIEW") return { label: "Opens in", target: auction.startTime };
    return null;
}

// Figma "Auctions Overview": breadcrumb, 48px title, the sale line — then search, then all lots
export function AuctionDetail({ auctionUuid }: { auctionUuid: string }) {
    const [state, setState] = useState<AuctionState>({ status: "loading" });

    useEffect(() => {
        let cancelled = false;
        getPublicAuction(auctionUuid)
            .then((auction) => {
                if (!cancelled) setState({ status: "ready", auction });
            })
            .catch((err) => {
                if (cancelled) return;
                const status = axios.isAxiosError(err) ? err.response?.status : undefined;
                // 400 = not a valid id, 404 = no such public sale
                setState(status === 404 || status === 400 ? { status: "not-found" } : { status: "error", message: getErrorMessage(err) });
            });
        return () => {
            cancelled = true;
        };
    }, [auctionUuid]);

    if (state.status === "loading") {
        return (
            <main className={PAGE_MAIN}>
                <section>
                    <div className="page-container">
                        <Breadcrumb crumbs={[]} />
                        <Skeleton className="mt-6 h-12 w-full max-w-lg rounded-none" />
                        <Skeleton className="mt-3 h-4 w-full max-w-xl rounded-none" />
                        <Skeleton className="mt-2 h-4 w-full max-w-md rounded-none" />
                    </div>
                </section>
            </main>
        );
    }

    if (state.status !== "ready") {
        return (
            <main className={PAGE_MAIN}>
                <section>
                    <div className="page-container">
                        <Breadcrumb crumbs={[]} />
                        <div className="py-24 text-center">
                            <h1 className="text-[24px] leading-8 font-medium text-[#0d0d0d]">{state.status === "not-found" ? "Auction not found" : "Couldn't load this auction"}</h1>
                            <p className={cn(BODY, "mx-auto mt-3 max-w-sm")}>{state.status === "not-found" ? "This sale may have been withdrawn, or the link is incorrect." : state.message}</p>
                            <Link href="/" className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE, "mt-6")}>
                                Browse all auctions
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    const { auction } = state;
    const countdown = saleCountdown(auction);
    const status = STOREFRONT_STATUS_LABELS[auction.status] ?? auction.status;

    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb crumbs={[{ label: auction.title }]} />
                    <h1 className={cn(PAGE_TITLE, "mt-6")}>{auction.title}: Overview</h1>
                    <p className={cn(BODY, "mt-3 max-w-168.5")}>
                        {/* part of a sentence — the short description's formatting is dropped here */}
                        {status} · {auctionMeta(auction)}.{auction.short_description && ` ${htmlToPlainText(auction.short_description)}`}
                    </p>
                </div>
            </section>

            <AuctionLots
                auctionUuid={auction.uuid}
                aside={countdown ? <AuctionCountdown label={countdown.label} target={countdown.target} className="shrink-0" /> : <span className={EYEBROW}>Sale closed</span>}
            />
        </main>
    );
}
