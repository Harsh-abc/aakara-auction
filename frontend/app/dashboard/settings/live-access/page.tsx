"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { LiveAccess } from "@/components/core/Dashboard/settings/LiveAccess"

export default function LiveAccessPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="Live Access" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    Choose which bidders can see an auction while it&apos;s live. Everyone else — signed-out visitors included — sees the default
                    &ldquo;coming soon&rdquo; banner for it. Staff always see every sale. Visible to super admins only.
                </p>
            </div>
            <LiveAccess />
        </div>
    )
}
