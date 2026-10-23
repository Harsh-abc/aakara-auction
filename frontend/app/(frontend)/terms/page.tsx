import type { Metadata } from "next"

import { TermsPage } from "@/components/core/frontend/legal/TermsPage"

export const metadata: Metadata = {
    title: "Terms and conditions | Aakara",
    description: "Terms and Conditions of Sale governing every auction and private sale conducted by Akara Auctions Private Limited.",
}

export default function TermsRoute() {
    return (
        <div className="bg-white">
            <TermsPage />
        </div>
    )
}
