import type { Metadata } from "next"

import { TermsPage } from "@/components/core/frontend/legal/TermsPage"

export const metadata: Metadata = {
    title: "Terms and conditions | Aakara",
    description: "Terms and conditions for the sale of fixed-price Objects on Akara.",
}

export default function TermsRoute() {
    return (
        <div className="bg-white">
            <TermsPage />
        </div>
    )
}
