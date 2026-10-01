import DashboardFormText from "@/components/common/DashboardFormText";
import { StatsCard } from "@/components/common/StatsCard";
import { AuctionStats } from "@/components/core/Dashboard/auctions/AuctionStats";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="px-8 py-7.5">
      <div className="flex items-center justify-between w-full">
        <div className="">
          <DashboardFormText text="Dashboard" className="text-[24px]" />
          <p className="text-[13px] text-[#62666F]">Monitor your aucitons, bids and overall performance</p>
        </div>
        <div>
          <Button className={'h-11 rounded-[8px] bg-[#F5A000] text-black'}>
            <Link href={'/dashboard/auctions'} className="flex items-center gap-2">
              <PlusIcon /> Create Auction
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <AuctionStats />
      </div>
    </div>
  )
}