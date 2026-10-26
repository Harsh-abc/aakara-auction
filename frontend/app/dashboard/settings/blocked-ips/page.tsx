"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { BlockedIps } from "@/components/core/Dashboard/settings/BlockedIps"

export default function BlockedIpsPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="Blocked IPs" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    IP addresses blocked from signing in after too many failed attempts. Unblock one, or all of them, to let them sign in as usual. Visible to super admins only.
                </p>
            </div>
            <BlockedIps />
        </div>
    )
}
