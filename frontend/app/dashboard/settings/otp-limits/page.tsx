"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { OtpLimits } from "@/components/core/Dashboard/settings/OtpLimits"

export default function OtpLimitsPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="OTP Limits" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    Sign-up email and SMS codes are limited per email and per phone number. Reset a limit to let someone request codes again straight away. Visible to super admins only.
                </p>
            </div>
            <OtpLimits />
        </div>
    )
}
