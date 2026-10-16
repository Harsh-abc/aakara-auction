"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { ActivityLogs } from "@/components/core/Dashboard/settings/ActivityLogs"

export default function ActivityLogsPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="Activity Logs" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    Everything that happens on the platform — who did it, when, and from which IP address. Visible to super admins only.
                </p>
            </div>
            <ActivityLogs />
        </div>
    )
}
