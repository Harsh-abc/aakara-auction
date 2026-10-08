import type { Metadata } from "next"

import { HomePage } from "@/components/core/frontend/home/HomePage"

export const metadata: Metadata = {
    title: "Aakara | Fine Art Auctions",
    description: "The live or next upcoming fine art auction at Aakara.",
}

export default function Home() {
    return (
        <div className="min-h-svh bg-white">
            <HomePage />
        </div>
    )
}
