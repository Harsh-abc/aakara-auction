"use client"


import { StatsCard } from "@/components/common/StatsCard"



export function AuctionStats() {
    return (
        <div
            className="
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-4
        py-6
      "
        >

            <StatsCard
                title="Auctions"
                value="48"
                description="+6 this month"
                image={"/admin/statscard01.png"}
                imageClassName="text-slate-600"
            />
            <StatsCard
                title="Live Auctions"
                value="6"
                description="Active bidding"
                image={"/admin/statscard02.png"}
                imageClassName="text-emerald-500"
            />

            <StatsCard
                title="Scheduled"
                value="10"
                description="Starting soon"
                image={"/admin/statscard03.png"}
                imageClassName="text-orange-500"
            />

            <StatsCard
                title="Completed"
                value="48"
                description="Archived results"
                image={"/admin/statscard04.png"}
                imageClassName="text-slate-600"
            />

        </div>
    )
}