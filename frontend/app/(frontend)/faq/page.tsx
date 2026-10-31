import type { Metadata } from "next"

import { FaqPage } from "@/components/core/frontend/legal/FaqPage"

export const metadata: Metadata = {
    title: "FAQs | Akara",
    description: "Answers to common questions about buying at Akara: viewing lots, registering and bidding, charges, payment, delivery and Special Lots.",
}

export default function FaqRoute() {
    return (
        <div className="bg-white">
            <FaqPage />
        </div>
    )
}
