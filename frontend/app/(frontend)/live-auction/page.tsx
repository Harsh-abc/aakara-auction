import type { Metadata } from "next"

import { LiveAuctionRedirect } from "@/components/core/frontend/auctions/LiveAuctionRedirect"

export const metadata: Metadata = {
    title: "Live auction | Akara",
}

// "Live auction" in the menu — finds the lot on the block and opens the live room
export default function LiveAuction() {
    return (
        <div className="min-h-svh bg-white">
            <LiveAuctionRedirect />
        </div>
    )
}
