"use client"

import {
    Gavel,
    Activity,
    CalendarDays,
    CircleCheck,
} from "lucide-react"
import { AuctionStatsCard } from "./AuctionStatsCard"



export function AuctionStats() {
    return (
        <div
            className="
        grid
        grid-cols-1
        gap-3
        sm:grid-cols-2
        lg:grid-cols-4
      "
        >

            {/* Auctions */}
            <AuctionStatsCard
                title="Auctions"
                value="48"
                description="+6 this month"
                icon={Gavel}
                iconBgClassName="bg-slate-100"
                iconClassName="text-slate-600"
            />

            {/* Live Auctions */}
            <AuctionStatsCard
                title="Live Auctions"
                value="6"
                description="Active bidding"
                icon={Activity}
                iconBgClassName="bg-emerald-100"
                iconClassName="text-emerald-500"
            />

            {/* Scheduled */}
            <AuctionStatsCard
                title="Scheduled"
                value="10"
                description="Starting soon"
                icon={CalendarDays}
                iconBgClassName="bg-orange-50"
                iconClassName="text-orange-500"
            />

            {/* Completed */}
            <AuctionStatsCard
                title="Completed"
                value="48"
                description="Archived results"
                icon={CircleCheck}
                iconBgClassName="bg-slate-100"
                iconClassName="text-slate-600"
            />

        </div>
    )
}