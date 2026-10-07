import { Suspense } from "react"
import type { Metadata } from "next"
import { MyProfile } from "@/components/core/frontend/profile/MyProfile"

export const metadata: Metadata = {
    title: "My profile | Aakara",
}

export default function MyProfilePage() {
    return (
        <div className="min-h-svh bg-white">
            {/* MyProfile reads ?tab= via useSearchParams, which needs a Suspense boundary */}
            <Suspense>
                <MyProfile />
            </Suspense>
        </div>
    )
}
