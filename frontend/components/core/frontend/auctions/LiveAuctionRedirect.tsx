"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { getFeaturedAuction, getPublicLot, getPublicLots } from "@/services/operations/publicAuction.api";

import { Breadcrumb, PAGE_MAIN } from "../storefront";
import { auctionHref } from "./auctionDisplay";
import { lotHref } from "./detail/lotDisplay";
import { isClosedLot } from "./lot/lotPageDisplay";

// nothing live or scheduled — the Upcoming / Live tab on the home page
const FALLBACK_HREF = "/?tab=upcoming#auctions";

// the live room has no address of its own (it is focused on a lot), so work out where it is right now
async function liveRoomHref() {
    // the live sale, otherwise the next one to open
    const auction = await getFeaturedAuction();
    if (!auction) return FALLBACK_HREF;

    const { lots: firstPage } = await getPublicLots({ auctionUuid: auction.uuid, page: 1, limit: 1 });
    if (!firstPage.length) return auctionHref(auction);

    // the lot page carries the whole order of sale: the lot on the block, else the next to come up
    const { lots } = await getPublicLot(auction.uuid, firstPage[0].uuid);
    const lot = lots.find((item) => item.status === "ACTIVE") ?? lots.find((item) => !isClosedLot(item)) ?? firstPage[0];
    return lotHref(auction.uuid, lot);
}

// "Live auction" in the menu lands here and is sent on to the live room
export function LiveAuctionRedirect() {
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        liveRoomHref()
            .catch(() => FALLBACK_HREF)
            .then((href) => {
                if (!cancelled) router.replace(href);
            });
        return () => {
            cancelled = true;
        };
    }, [router]);

    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb crumbs={[{ label: "Live auction" }]} />
                    <Skeleton className="mt-6 h-8 w-full max-w-sm rounded-none" />
                    <Skeleton className="mt-6 aspect-video w-full rounded-none" />
                </div>
            </section>
        </main>
    );
}
