"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { ProxyBids } from "@/components/core/Dashboard/proxyBids/ProxyBids"

export default function ProxyBidsPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="Proxy Bids" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    Every maximum bid left on a lot before it opened: who set it, how much, from which IP and device, and how it did.
                    Visible to super admins and admins only.
                </p>
            </div>
            <ProxyBids />
        </div>
    )
}
