"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { NotificationSettings } from "@/components/core/Dashboard/settings/NotificationSettings"

export default function NotificationSettingsPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="Notifications" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    Pause or resume the emails and SMS users get for their activity — proxy bids, lots won and registration. Visible to super
                    admins only.
                </p>
            </div>
            <NotificationSettings />
        </div>
    )
}
