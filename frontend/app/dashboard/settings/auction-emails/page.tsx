"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { AuctionEmails } from "@/components/core/Dashboard/settings/AuctionEmails"

export default function AuctionEmailsPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="Auction Emails" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    Email the bidders registered for an auction — for example a last-minute reminder before the sale opens. Pick the auction,
                    write the message, choose the bidders and send. Visible to super admins only.
                </p>
            </div>
            <AuctionEmails />
        </div>
    )
}
