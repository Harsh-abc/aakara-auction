import type { Metadata } from "next"

import { AuctionsPage } from "@/components/core/frontend/auctions/AuctionsPage"

export const metadata: Metadata = {
    title: "Auctions | Aakara",
    description: "Upcoming, live and past fine art auctions at Aakara.",
}

export default function Auctions() {
    return (
        <div className="min-h-svh bg-white">
            <AuctionsPage />
        </div>
    )
}
