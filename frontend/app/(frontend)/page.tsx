import type { Metadata } from "next"

import { AuctionsPage } from "@/components/core/frontend/auctions/AuctionsPage"

export const metadata: Metadata = {
    title: "Auctions | Akara",
    description: "Upcoming, live and past fine art auctions at Akara.",
}

export default function Auctions() {
    return (
        <div className="min-h-svh bg-white">
            <AuctionsPage />
        </div>
    )
}
