"use client";

import { useParams } from "next/navigation";

import AuctionConsole from "@/components/core/Dashboard/auctions/LiveAuctions/console/AuctionConsole";

// Auctioneer console for one live sale (opened from the bidding floors)
export default function AuctionConsolePage() {
    const { auctionUuid } = useParams<{ auctionUuid: string }>();

    return (
        <div className="w-full">
            {/* fresh console per sale, so nothing carries over between auctions */}
            <AuctionConsole key={auctionUuid} auctionUuid={auctionUuid} />
        </div>
    );
}
