import { AuctionDataTable } from "@/components/core/Dashboard/auctions/AuctionDataTable";
import { columns } from "@/components/core/Dashboard/auctions/AuctionsColumns";
import { AuctionStats } from "@/components/core/Dashboard/auctions/AuctionStats";
import { Button } from "@/components/ui/button";
import { auctionData } from "@/lib/data";
// import { auctionData } from "@/lib/data";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function Auctions() {
    return (
        <div className="px-8 py-8">
            <div className=" flex items-center justify-between">
                <h3 className="text-2xl font-bold">Auction Campaigns</h3>
                <div>
                    <Button className="px-3 py-4.5 text-[15px] bg-dashboardButton hover:bg-amber-500">
                        <Plus />
                        <Link href={'/dashboard/auctions/create-auctions'} >
                            Create Auction
                        </Link>
                    </Button>
                </div>
            </div>
            <AuctionStats />
            <AuctionDataTable columns={columns} data={auctionData} />
        </div>
    )
}