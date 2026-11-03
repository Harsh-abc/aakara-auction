"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuctionViewers } from "@/hooks/useAuctionViewers";
import { cn } from "@/lib/utils";

import { BODY, Breadcrumb, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, BUTTON_SOLID, EYEBROW, PAGE_MAIN } from "../storefront";
import { auctionHref, STOREFRONT_STATUS_LABELS } from "./auctionDisplay";
import { saleCountdown } from "./detail/AuctionDetail";
import { lotHeading, lotHref } from "./detail/lotDisplay";
import { BidDialog } from "./lot/BidDialog";
import { BidLadder } from "./lot/BidLadder";
import { LotPageMessage } from "./lot/LotPageChrome";
import { LotSummary } from "./lot/LotSummary";
import { LotStatusTag, Tag } from "./lot/LotTag";
import { OrderOfSale } from "./lot/OrderOfSale";
import { TopLots } from "./lot/TopLots";
import { lotRange, lotTag, roomLot } from "./lot/lotPageDisplay";
import { useBidAction } from "./lot/useBidAction";
import { useLotPage } from "./lot/useLotPage";

// Figma "Live Auction": 300px order of sale | lot image + 320px summary, bid ladder under them
const ROOM_GRID = "mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8";
const LOT_GRID = "grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_320px] md:gap-9";

// "1,121 watching"
const VIEWER_COUNT = new Intl.NumberFormat("en-IN");

// the live auction room, focused on one lot
export function LotDetailPage({ auctionUuid, lotUuid }: { auctionUuid: string; lotUuid: string }) {
    const state = useLotPage(auctionUuid, lotUuid);
    const viewers = useAuctionViewers(auctionUuid);
    const { onBid, target, setTarget, savedCount, onSaved } = useBidAction();
    const router = useRouter();

    // the room isn't a lot browser: it stays on the lot on the block (else the next up),
    // and moves on with the sale when the next lot opens
    const followUuid = state.status === "ready" ? roomLot(state.data.lots)?.uuid : undefined;
    useEffect(() => {
        if (followUuid && followUuid !== lotUuid) router.replace(lotHref(auctionUuid, { uuid: followUuid }));
    }, [followUuid, lotUuid, auctionUuid, router]);

    if (state.status === "loading" || (followUuid && followUuid !== lotUuid)) {
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
    const liveLot = lots.find((item) => item.status === "ACTIVE") ?? null;

    return (
        <main className={PAGE_MAIN}>
            {/* the room: sale header, order of sale, the lot on view and its ladder */}
            <section>
                <div className="page-container">
                    <Breadcrumb crumbs={[{ label: "Live auction" }]} />

                    <header className="mt-6 flex flex-col gap-4 border-b border-[#cecece] pb-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">{auction.title}</h1>
                            {subline && <p className={cn(EYEBROW, "mt-2")}>{subline}</p>}
                        </div>
                        <span className={EYEBROW}>{liveLot ? `${lotTag(liveLot)} on the block` : countdown ? "No lot on the block" : "Sale closed"}</span>
                    </header>

                    <div className={ROOM_GRID}>
                        <OrderOfSale lots={lots} saleClosed={!countdown} className="order-2 lg:order-1" />

                        <div className="order-1 min-w-0 lg:order-2">
                            <div className={LOT_GRID}>
                                <div>
                                    {/* LIVE · LOT 08 over the image, how many are watching opposite */}
                                    <div className="flex h-8 items-center gap-3">
                                        {lot.status === "ACTIVE" ? (
                                            <Tag tone="live" label="Live" className="h-5.5 gap-1.25 px-2.5 text-[12px] tracking-[0.08em]" />
                                        ) : (
                                            <LotStatusTag lot={lot} className="h-5.5 gap-1.25 px-2.5" />
                                        )}
                                        <span className="text-[12px] leading-4 font-semibold tracking-[0.08em] text-[#0d0d0d] uppercase">{lotTag(lot)}</span>
                                        {viewers !== null && (
                                            <span className="ml-auto inline-flex h-5.75 items-center border border-[#cecece] bg-white px-2 text-[10px] leading-3.75 tracking-[0.14em] text-[#0d0d0d] uppercase tabular-nums">
                                                {VIEWER_COUNT.format(viewers)} watching
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 flex aspect-square items-center justify-center overflow-hidden">
                                        {lot.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={lot.image} alt={lotHeading(lot)} className="h-full w-full object-contain" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-[#ebebeb]">
                                                <ImageOff className="size-8 text-[#cecece]" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <LotSummary auctionUuid={auction.uuid} lot={lot} onBid={onBid} bidRefreshKey={savedCount} />
                            </div>

                            <BidLadder lot={lot} className="mt-8" />
                        </div>
                    </div>
                </div>
            </section>

            <TopLots auctionUuid={auction.uuid} lots={lots} saleStatus={saleStatus} countdown={countdown} onBid={onBid} />

            <section>
                <div className="page-container">
                    <div className="flex flex-col gap-4 bg-white px-5 py-5 md:flex-row md:items-center md:justify-between">
                        <p className={BODY}>Ready to bid on one of these lots? Register once, then bid live or leave a proxy bid.</p>
                        <div className="flex shrink-0 gap-2">
                            <button type="button" onClick={() => onBid(lot.status === "ACTIVE" ? "bid" : "proxy", lot)} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE)}>
                                Place bid
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
