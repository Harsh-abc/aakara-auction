"use client"

import toast from "react-hot-toast"

import { Skeleton } from "@/components/ui/skeleton"

import { auctionHref, auctionMeta } from "./auctionDisplay"
import { lotHeading } from "./detail/lotDisplay"
import { BidDialog } from "./lot/BidDialog"
import { LotCatalogueDetails } from "./lot/LotCatalogueDetails"
import { LotEssay } from "./lot/LotEssay"
import { LotFaqs } from "./lot/LotFaqs"
import { LotGallery } from "./lot/LotGallery"
import { LOT_PAGE, LotBreadcrumb, LotPageMessage } from "./lot/LotPageChrome"
import { LotPricePanel } from "./lot/LotPricePanel"
import { lotTag } from "./lot/lotPageDisplay"
import { useBidAction } from "./lot/useBidAction"
import { useLotPage } from "./lot/useLotPage"

// the native share sheet where there is one, otherwise copy the link
async function shareLot(title: string) {
    const url = window.location.href
    try {
        if (navigator.share) {
            await navigator.share({ title, url })
            return
        }
        await navigator.clipboard.writeText(url)
        toast.success("Link copied")
    } catch (err) {
        // closing the share sheet isn't an error
        if (err instanceof DOMException && err.name === "AbortError") return
        toast.error("Couldn't share this lot")
    }
}

// the individual lot page — every image, the full catalogue entry and the essay
export function LotFullPage({ auctionUuid, lotUuid }: { auctionUuid: string; lotUuid: string }) {
    const state = useLotPage(auctionUuid, lotUuid)
    const { onBid, target, setTarget } = useBidAction()

    if (state.status === "loading") {
        return (
            <main className={LOT_PAGE}>
                <LotBreadcrumb crumbs={[]} />
                <Skeleton className="mt-8 h-12 w-full max-w-md rounded-none" />
                <Skeleton className="mt-3 h-4 w-full max-w-xs rounded-none" />
                <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
                    <Skeleton className="aspect-square rounded-none" />
                    <div>
                        <Skeleton className="h-8 w-48 rounded-none" />
                        <Skeleton className="mt-6 h-40 w-full rounded-none" />
                        <Skeleton className="mt-6 h-11 w-full rounded-none" />
                    </div>
                </div>
            </main>
        )
    }

    if (state.status !== "ready") {
        return <LotPageMessage auctionUuid={auctionUuid} notFound={state.status === "not-found"} message={state.status === "error" ? state.message : undefined} />
    }

    const { auction, lot, lots } = state.data

    return (
        <main className={LOT_PAGE}>
            <LotBreadcrumb
                crumbs={[
                    { label: auction.title, href: auctionHref(auction) },
                    { label: "Lots", href: auctionHref(auction) },
                    { label: lotTag(lot) },
                ]}
            />

            <header className="mt-8">
                <h1 className="text-[48px] leading-12 font-medium tracking-[-0.025em] text-[#0d0d0d] max-md:text-[32px] max-md:leading-10">
                    {auction.title}
                </h1>
                <p className="mt-3 text-[14px] leading-[22.75px] text-[#717171]">{auctionMeta(auction)}</p>
            </header>

            <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
                <div className="min-w-0">
                    <LotGallery auctionUuid={auction.uuid} lot={lot} lots={lots} />
                    <LotCatalogueDetails lot={lot} className="mt-12 border-t border-[#cecece]" />
                    <button
                        type="button"
                        onClick={() => shareLot(`${lotHeading(lot)} | ${auction.title}`)}
                        className="mt-7.5 cursor-pointer text-[12px] leading-4 tracking-[0.12em] text-[#0d0d0d] uppercase underline underline-offset-2"
                    >
                        Tell a friend
                    </button>
                </div>

                <LotPricePanel lot={lot} onBid={onBid} className="lg:mt-10.75" />
            </div>

            <LotEssay html={lot.description} className="mt-16" />

            <LotFaqs className="mt-16" />

            <BidDialog
                auctionUuid={auction.uuid}
                lot={target ? lot : null}
                kind={target?.kind ?? "bid"}
                onKindChange={(kind) => setTarget((prev) => (prev ? { ...prev, kind } : prev))}
                onClose={() => setTarget(null)}
            />
        </main>
    )
}
