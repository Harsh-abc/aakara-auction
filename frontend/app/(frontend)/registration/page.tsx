import { Suspense } from "react"
import type { Metadata } from "next"
import { Registration } from "@/components/core/auth/registration/Registration"

export const metadata: Metadata = {
    title: "Log in / Sign up | Aakara",
}

export default function RegistrationPage() {
    return (
        <div className="bg-white">
            {/* Registration reads ?tab= and ?redirect= via useSearchParams, which needs a Suspense boundary */}
            <Suspense>
                <Registration />
            </Suspense>
        </div>
    )
}
