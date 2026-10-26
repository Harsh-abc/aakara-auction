import { Suspense } from "react"
import type { Metadata } from "next"
import { DashboardAuthenticator } from "@/components/core/auth/authenticator/DashboardAuthenticator"

export const metadata: Metadata = {
    title: "Dashboard sign-in | Aakara",
}

export default function AuthenticatorPage() {
    return (
        <div className="bg-white">
            {/* reads ?redirect= via useSearchParams, which needs a Suspense boundary */}
            <Suspense>
                <DashboardAuthenticator />
            </Suspense>
        </div>
    )
}
