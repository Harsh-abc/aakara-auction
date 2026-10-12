"use client"

import { useParams } from "next/navigation"

import { LivePlayer } from "@/components/core/frontend/auctions/lot/LivePlayer"

// player only, for iframes: <iframe src="https://<site>/embed/<auction uuid>" allow="autoplay; fullscreen" />
export default function EmbedPlayerPage() {
    const { auctionUuid } = useParams<{ auctionUuid: string }>()

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#ebebeb]">
            <LivePlayer
                auctionUuid={auctionUuid}
                fallback={
                    <div className="absolute inset-0 flex items-center justify-center gap-2 p-4 text-center text-[13px] text-[#717171]">
                        <span className="size-1.75 animate-pulse rounded-full bg-[#aaa]" />
                        The live auction will begin shortly
                    </div>
                }
            />
        </div>
    )
}
