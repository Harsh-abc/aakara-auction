"use client"

import Link from "next/link"

import { Skeleton } from "@/components/ui/skeleton"
import type { GalleryItem } from "@/lib/types/profile.types"

import { STOREFRONT_STATUS_LABELS } from "../auctions/auctionDisplay"
import { LotCard } from "../auctions/detail/LotCard"
import { useGallery } from "../auctions/detail/useGallery"

// one block per sale, in the order the newest saved lot of each sale was saved
function groupBySale(items: GalleryItem[]) {
    const sales = new Map<string, { auction: GalleryItem["auction"]; items: GalleryItem[] }>()
    for (const item of items) {
        const sale = sales.get(item.auction.uuid)
        if (sale) sale.items.push(item)
        else sales.set(item.auction.uuid, { auction: item.auction, items: [item] })
    }
    return [...sales.values()]
}

/** "My auction gallery" tab: lots saved from the auction pages. `empty` shows when nothing is saved. */
export function MyGallery({ empty }: { empty: React.ReactNode }) {
    const { items, error, controls } = useGallery()

    if (error && !items) return <p className="py-6 text-center text-[14px] leading-[22.75px] text-[#717171]">{error}</p>

    if (!items) {
        return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="aspect-[3/4] w-full rounded-none" />
                ))}
            </div>
        )
    }

    if (items.length === 0) return <>{empty}</>

    return (
        <div className="flex flex-col gap-10">
            {groupBySale(items).map(({ auction, items: saleItems }) => (
                <div key={auction.uuid}>
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                        <Link href={`/auctions/${auction.uuid}`} className="text-[16px] leading-6 font-medium text-[#0d0d0d] hover:underline">
                            {auction.title}
                        </Link>
                        <span className="text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">
                            {STOREFRONT_STATUS_LABELS[auction.status] ?? auction.status} · {saleItems.length}{" "}
                            {saleItems.length === 1 ? "lot" : "lots"} saved
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {saleItems.map(({ lot }) => (
                            <LotCard key={lot.uuid} lot={lot} auctionUuid={auction.uuid} gallery={controls} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
