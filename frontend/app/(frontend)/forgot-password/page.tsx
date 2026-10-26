import { Suspense } from "react"
import type { Metadata } from "next"

import { ForgotPassword } from "@/components/core/auth/password/ForgotPassword"

export const metadata: Metadata = {
    title: "Forgot password | Aakara",
}

export default function ForgotPasswordPage() {
    return (
        <div className="bg-white">
            {/* ForgotPassword reads ?email= via useSearchParams, which needs a Suspense boundary */}
            <Suspense>
                <ForgotPassword />
            </Suspense>
        </div>
    )
}
