"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import DashboardFormText from "@/components/common/DashboardFormText"
import { LotBidHistory } from "@/components/core/Dashboard/home/LotBidHistory"

// ?auction= opens that sale (the dashboard panel links here with it)
function BidHistory() {
    const auction = useSearchParams().get("auction")
    return <LotBidHistory standalone initialAuction={auction} />
}

export default function BidHistoryPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-6">
            <div>
                <DashboardFormText text="Lot Bid History" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    Every bid and bidder on each lot — while a sale runs and after it ends.
                </p>
            </div>
            <Suspense>
                <BidHistory />
            </Suspense>
        </div>
    )
}
