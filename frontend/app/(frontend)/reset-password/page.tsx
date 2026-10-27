import { Suspense } from "react"
import type { Metadata } from "next"

import { ResetPassword } from "@/components/core/auth/password/ResetPassword"

export const metadata: Metadata = {
    title: "Reset password | Akara",
}

export default function ResetPasswordPage() {
    return (
        <div className="bg-white">
            {/* ResetPassword reads ?token= via useSearchParams, which needs a Suspense boundary */}
            <Suspense>
                <ResetPassword />
            </Suspense>
        </div>
    )
}
