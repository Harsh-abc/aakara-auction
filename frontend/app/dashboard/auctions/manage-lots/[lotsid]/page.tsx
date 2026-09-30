
import { LiveAuctionDataTable } from "@/components/core/Dashboard/auctions/LiveAuctions/LiveAuctionDataTable";
import { auctionLots } from "@/lib/data";

export default function ManageViewLots() {
    return (
        <div>
            <LiveAuctionDataTable data={auctionLots} />
        </div>
    )
}