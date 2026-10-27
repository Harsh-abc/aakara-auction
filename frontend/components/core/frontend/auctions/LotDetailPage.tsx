"use client";

import Link from "next/link";
import { ImageOff } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { BODY, Breadcrumb, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, BUTTON_SOLID, EYEBROW, PAGE_MAIN } from "../storefront";
import { AuctionCountdown } from "./AuctionCountdown";
import { auctionHref, isLive, STOREFRONT_STATUS_LABELS } from "./auctionDisplay";
import { saleCountdown } from "./detail/AuctionDetail";
import { lotHeading } from "./detail/lotDisplay";
import { BidDialog } from "./lot/BidDialog";
import { BidLadder } from "./lot/BidLadder";
import { LotPageMessage } from "./lot/LotPageChrome";
import { LotSummary } from "./lot/LotSummary";
import { OrderOfSale } from "./lot/OrderOfSale";
import { TopLots } from "./lot/TopLots";
import { lotRange, lotTag } from "./lot/lotPageDisplay";
import { useBidAction } from "./lot/useBidAction";
import { useLotPage } from "./lot/useLotPage";

// Figma "Live Auction": 300px order of sale | lot image + 320px summary, bid ladder under them
const ROOM_GRID = "mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8";
const LOT_GRID = "grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_320px] md:gap-9";

// the live auction room, focused on one lot
export function LotDetailPage({ auctionUuid, lotUuid }: { auctionUuid: string; lotUuid: string }) {
    const state = useLotPage(auctionUuid, lotUuid);
    const { onBid, target, setTarget, savedCount, onSaved } = useBidAction();

    if (state.status === "loading") {
        return (
            <main className={PAGE_MAIN}>
                <section>
                    <div className="page-container">
                        <Breadcrumb crumbs={[]} />
                        <Skeleton className="mt-6 h-8 w-full max-w-sm rounded-none" />
                        <Skeleton className="mt-1.75 h-3.5 w-full max-w-xs rounded-none" />
                        <div className={ROOM_GRID}>
                            <Skeleton className="hidden h-150 rounded-none lg:block" />
                            <div className={LOT_GRID}>
                                <Skeleton className="aspect-square rounded-none" />
                                <div>
                                    <Skeleton className="h-5 w-24 rounded-none" />
                                    <Skeleton className="mt-4 h-8 w-48 rounded-none" />
                                    <Skeleton className="mt-6 h-36 w-full rounded-none" />
                                    <Skeleton className="mt-5 h-11 w-full rounded-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    if (state.status !== "ready") {
        return <LotPageMessage auctionUuid={auctionUuid} notFound={state.status === "not-found"} message={state.status === "error" ? state.message : undefined} />;
    }

    const { auction, lot, lots } = state.data;
    const countdown = saleCountdown(auction);
    const saleStatus = (STOREFRONT_STATUS_LABELS[auction.status] ?? auction.status).toLowerCase();
    const subline = [lotRange(lots), auction.auctioneer].filter(Boolean).join(" · ");

    return (
        <main className={PAGE_MAIN}>
            {/* the room: sale header, order of sale + live video, the lot on view and its ladder */}
            <section>
                <div className="page-container">
                    <Breadcrumb crumbs={[{ label: auction.title, href: auctionHref(auction) }, { label: lotTag(lot) }]} />

                    <header className="mt-6 flex flex-col gap-4 border-b border-[#cecece] pb-4.25 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">{auction.title}</h1>
                            {subline && <p className={cn(EYEBROW, "mt-1.75")}>{subline}</p>}
                        </div>
                        {countdown ? <AuctionCountdown label={countdown.label} target={countdown.target} className="shrink-0" /> : <span className={EYEBROW}>Sale closed</span>}
                    </header>

                    <div className={ROOM_GRID}>
                        <OrderOfSale auctionUuid={auction.uuid} lots={lots} currentLotUuid={lot.uuid} saleClosed={!countdown} streaming={isLive(auction)} className="order-2 lg:order-1" />

                        <div className="order-1 min-w-0 lg:order-2">
                            <div className={LOT_GRID}>
                                <div className="flex aspect-square items-center justify-center overflow-hidden">
                                    {lot.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={lot.image} alt={lotHeading(lot)} className="h-full w-full object-contain" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-[#ebebeb]">
                                            <ImageOff className="size-8 text-[#cecece]" />
                                        </div>
                                    )}
                                </div>
                                <LotSummary auctionUuid={auction.uuid} lot={lot} onBid={onBid} bidRefreshKey={savedCount} />
                            </div>

                            <BidLadder lot={lot} className="mt-8" />
                        </div>
                    </div>
                </div>
            </section>

            {/* a hairline closes the room before the sale-wide table */}
            <div className="page-container" aria-hidden>
                <div className="border-t border-[#cecece]" />
            </div>

            <TopLots auctionUuid={auction.uuid} lots={lots} saleStatus={saleStatus} onBid={onBid} />

            <section>
                <div className="page-container">
                    <div className="flex flex-col gap-4 bg-white px-5 py-5 md:flex-row md:items-center md:justify-between">
                        <p className={BODY}>Ready to bid on one of these lots? Register once, then bid live or leave a proxy bid.</p>
                        <div className="flex shrink-0 gap-2">
                            <button type="button" onClick={() => onBid(lot.status === "ACTIVE" ? "bid" : "proxy", lot)} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE)}>
                                Place a bid
                            </button>
                            <Link href={auctionHref(auction)} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}>
                                Browse all lots
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* the lot comes from the live page state, so the dialog sees new bids as they land */}
            <BidDialog
                auctionUuid={auction.uuid}
                lot={target ? (target.lotUuid === lot.uuid ? lot : (lots.find((item) => item.uuid === target.lotUuid) ?? null)) : null}
                kind={target?.kind ?? "bid"}
                onKindChange={(kind) => setTarget((prev) => (prev ? { ...prev, kind } : prev))}
                onClose={() => setTarget(null)}
                onSaved={onSaved}
            />
        </main>
    );
}
