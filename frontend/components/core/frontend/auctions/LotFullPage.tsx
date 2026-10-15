"use client";

import { Check } from "lucide-react";
import toast from "react-hot-toast";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { BODY, Breadcrumb, PAGE_MAIN, PAGE_TITLE } from "../storefront";
import { auctionHref, auctionMeta } from "./auctionDisplay";
import { lotHeading } from "./detail/lotDisplay";
import { useGallery } from "./detail/useGallery";
import { BidDialog } from "./lot/BidDialog";
import { LotCatalogueDetails } from "./lot/LotCatalogueDetails";
// import { LotEssay } from "./lot/LotEssay"; // the editor-driven essay — back in once the API part is done
import { StaticLotEssay } from "./lot/StaticLotEssay";
import { LotFaqs } from "./lot/LotFaqs";
import { LotGallery } from "./lot/LotGallery";
import { LotPageMessage } from "./lot/LotPageChrome";
import { LotPricePanel } from "./lot/LotPricePanel";
import { lotTag } from "./lot/lotPageDisplay";
import { useBidAction } from "./lot/useBidAction";
import { useLotPage } from "./lot/useLotPage";

// Figma "Auction — Individual Lot": gallery + catalogue | 400px price panel (sticky)
const LOT_GRID = "grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px]";

// the native share sheet where there is one, otherwise copy the link
async function shareLot(title: string) {
    const url = window.location.href;
    try {
        if (navigator.share) {
            await navigator.share({ title, url });
            return;
        }
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
    } catch (err) {
        // closing the share sheet isn't an error
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error("Couldn't share this lot");
    }
}

// the individual lot page — every image, the full catalogue entry and the essay
export function LotFullPage({ auctionUuid, lotUuid }: { auctionUuid: string; lotUuid: string }) {
    const state = useLotPage(auctionUuid, lotUuid);
    const { onBid, target, setTarget } = useBidAction();
    const { controls: gallery } = useGallery();

    if (state.status === "loading") {
        return (
            <main className={PAGE_MAIN}>
                <section>
                    <div className="page-container">
                        <Breadcrumb crumbs={[]} />
                        <Skeleton className="mt-6 h-12 w-full max-w-md rounded-none" />
                        <Skeleton className="mt-3 h-4 w-full max-w-xs rounded-none" />
                    </div>
                </section>
                <section>
                    <div className={cn("page-container", LOT_GRID)}>
                        <Skeleton className="aspect-square rounded-none" />
                        <div>
                            <Skeleton className="h-8 w-48 rounded-none" />
                            <Skeleton className="mt-6 h-40 w-full rounded-none" />
                            <Skeleton className="mt-6 h-11 w-full rounded-none" />
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
    const saved = gallery.isSaved(lot.uuid);
    // the static essay's figures use the lot's own artwork images (or the main image)
    const galleryImages = lot.media.filter((item) => item.mediaType === "IMAGE").map((item) => item.url);
    const essayImages = galleryImages.length ? galleryImages : lot.image ? [lot.image] : [];

    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb
                        crumbs={[
                            { label: auction.title, href: auctionHref(auction) },
                            { label: "Lots", href: auctionHref(auction) },
                            { label: lotTag(lot) },
                        ]}
                    />
                    <h1 className={cn(PAGE_TITLE, "mt-6")}>{auction.title}</h1>
                    <p className={cn(BODY, "mt-3")}>{auctionMeta(auction)}</p>
                </div>
            </section>

            <section>
                <div className={cn("page-container", LOT_GRID)}>
                    <div className="min-w-0">
                        <LotGallery auctionUuid={auction.uuid} lot={lot} lots={lots} />

                        <button
                            type="button"
                            onClick={() => gallery.toggle(lot.uuid)}
                            disabled={gallery.isPending(lot.uuid)}
                            aria-pressed={saved}
                            className={cn(
                                "mt-6 inline-flex h-7.75 cursor-pointer items-center gap-1.5 border border-[#333] px-2.75 text-[11px] leading-[16.5px] tracking-[0.12em] text-[#0d0d0d] uppercase transition-colors duration-200 hover:border-[#d0a55d] hover:bg-[#fdedd6] disabled:cursor-wait disabled:opacity-60",
                                saved ? "bg-[#fdedd6]" : "bg-white",
                            )}
                        >
                            {saved ? <Check className="size-3" /> : <span aria-hidden>+</span>}
                            {saved ? "In my auction gallery" : "Add to my auction gallery"}
                        </button>

                        <LotCatalogueDetails lot={lot} className="mt-6 border-t border-[#cecece]" />

                        <button
                            type="button"
                            onClick={() => shareLot(`${lotHeading(lot)} | ${auction.title}`)}
                            className="mt-6 cursor-pointer text-[12px] leading-4 tracking-[0.12em] text-[#0d0d0d] uppercase underline underline-offset-2"
                        >
                            Tell a friend
                        </button>
                    </div>

                    <LotPricePanel lot={lot} onBid={onBid} className="self-start lg:sticky lg:top-25 lg:mt-10.75" />
                </div>
            </section>

            {/* STATIC essay for the client demo — switch back to the editor's description later:
                <LotEssay description={lot.description} /> */}
            <StaticLotEssay images={essayImages} />

            <LotFaqs />

            <BidDialog
                auctionUuid={auction.uuid}
                lot={target ? lot : null}
                kind={target?.kind ?? "bid"}
                onKindChange={(kind) => setTarget((prev) => (prev ? { ...prev, kind } : prev))}
                onClose={() => setTarget(null)}
            />
        </main>
    );
}
