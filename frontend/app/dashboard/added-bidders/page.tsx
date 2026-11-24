"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { AddedBidders } from "@/components/core/Dashboard/addedBidders/AddedBidders"

export default function AddedBiddersPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="Added Bidders" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    Bidder accounts created by a super admin. Register one for an auction to give them a paddle number — they&apos;re then
                    verified on all its lots and can be picked in Proxy Bids → Add a proxy bid.
                </p>
            </div>
            <AddedBidders />
        </div>
    )
}
