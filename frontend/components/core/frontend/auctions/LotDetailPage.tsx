"use client"

import Link from "next/link"
import { ImageOff } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { AuctionCountdown } from "./AuctionCountdown"
import { auctionHref, STOREFRONT_STATUS_LABELS } from "./auctionDisplay"
import { saleCountdown } from "./detail/AuctionDetail"
import { lotHeading } from "./detail/lotDisplay"
import { BidDialog } from "./lot/BidDialog"
import { BidLadder } from "./lot/BidLadder"
import { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID } from "./lot/BidButtons"
import { LOT_PAGE, LotBreadcrumb, LotPageMessage } from "./lot/LotPageChrome"
import { LotSummary } from "./lot/LotSummary"
import { OrderOfSale } from "./lot/OrderOfSale"
import { TopLots } from "./lot/TopLots"
import { lotRange, lotTag } from "./lot/lotPageDisplay"
import { useBidAction } from "./lot/useBidAction"
import { useLotPage } from "./lot/useLotPage"

// the live auction room, focused on one lot
export function LotDetailPage({ auctionUuid, lotUuid }: { auctionUuid: string; lotUuid: string }) {
    const state = useLotPage(auctionUuid, lotUuid)
    const { onBid, target, setTarget } = useBidAction()

    if (state.status === "loading") {
        return (
            <main className={LOT_PAGE}>
                <LotBreadcrumb crumbs={[]} />
                <Skeleton className="mt-6 h-8 w-full max-w-sm rounded-none" />
                <Skeleton className="mt-3 h-3 w-full max-w-xs rounded-none" />
                <div className="mt-6 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8.25">
                    <Skeleton className="hidden h-150 rounded-none lg:block" />
                    <div className="grid gap-9 md:grid-cols-[minmax(0,1fr)_320px]">
                        <Skeleton className="aspect-square rounded-none" />
                        <div>
                            <Skeleton className="h-4 w-24 rounded-none" />
                            <Skeleton className="mt-4 h-8 w-48 rounded-none" />
                            <Skeleton className="mt-6 h-36 w-full rounded-none" />
                            <Skeleton className="mt-5 h-11 w-full rounded-none" />
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    if (state.status !== "ready") {
        return <LotPageMessage auctionUuid={auctionUuid} notFound={state.status === "not-found"} message={state.status === "error" ? state.message : undefined} />
    }

    const { auction, lot, lots } = state.data
    const countdown = saleCountdown(auction)
    const saleStatus = (STOREFRONT_STATUS_LABELS[auction.status] ?? auction.status).toLowerCase()
    const subline = [lotRange(lots), auction.auctioneer].filter(Boolean).join(" · ")

    return (
        <main className={LOT_PAGE}>
            <LotBreadcrumb crumbs={[{ label: auction.title, href: auctionHref(auction) }, { label: lotTag(lot) }]} />

            <header className="mt-6 flex flex-col gap-4 border-b border-[#cecece] pb-4.25 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">{auction.title}</h1>
                    {subline && <p className="mt-1.75 text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">{subline}</p>}
                </div>
                {countdown ? (
                    <AuctionCountdown label={countdown.label} target={countdown.target} className="shrink-0" />
                ) : (
                    <span className="text-[11px] tracking-[0.16em] text-[#717171] uppercase">Sale closed</span>
                )}
            </header>

            <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8.25">
                <OrderOfSale
                    auctionUuid={auction.uuid}
                    lots={lots}
                    currentLotUuid={lot.uuid}
                    saleClosed={!countdown}
                    className="order-2 lg:order-1"
                />

                <div className="order-1 min-w-0 lg:order-2">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_320px] md:gap-9">
                        <div className="flex aspect-square items-center justify-center overflow-hidden md:mt-0.5">
                            {lot.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={lot.image} alt={lotHeading(lot)} className="h-full w-full object-contain" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#ebebeb]">
                                    <ImageOff className="size-8 text-neutral-400" />
                                </div>
                            )}
                        </div>
                        <LotSummary auctionUuid={auction.uuid} lot={lot} onBid={onBid} />
                    </div>

                    <BidLadder lot={lot} className="mt-8" />
                </div>
            </div>

            <TopLots
                auctionUuid={auction.uuid}
                lots={lots}
                saleStatus={saleStatus}
                onBid={onBid}
                className="mt-16 border-t border-[#cecece] pt-16"
            />

            <section className="mt-16 flex flex-col gap-4 bg-white px-5 py-5 md:flex-row md:items-center md:justify-between">
                <p className="text-[14px] leading-[22.75px] text-[#717171]">
                    Ready to bid on one of these lots? Register once, then bid live or leave a proxy bid.
                </p>
                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={() => onBid(lot.status === "ACTIVE" ? "bid" : "proxy", lot)}
                        className={cn(BUTTON, BUTTON_SOLID, "w-auto px-5.25")}
                    >
                        Place a bid
                    </button>
                    <Link href={auctionHref(auction)} className={cn(BUTTON, BUTTON_OUTLINE, "w-auto px-5.25")}>
                        Browse all lots
                    </Link>
                </div>
            </section>

            {/* the lot comes from the live page state, so the dialog sees new bids as they land */}
            <BidDialog
                auctionUuid={auction.uuid}
                lot={target ? (target.lotUuid === lot.uuid ? lot : lots.find((item) => item.uuid === target.lotUuid) ?? null) : null}
                kind={target?.kind ?? "bid"}
                onKindChange={(kind) => setTarget((prev) => (prev ? { ...prev, kind } : prev))}
                onClose={() => setTarget(null)}
            />
        </main>
    )
}
