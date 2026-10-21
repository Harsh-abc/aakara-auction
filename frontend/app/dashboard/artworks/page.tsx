"use client"

import DashboardFormText from "@/components/common/DashboardFormText"
import { Artworks } from "@/components/core/Dashboard/artworks/Artworks"

export default function ArtworksPage() {
    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-8 md:py-8">
            <div>
                <DashboardFormText text="Artworks" className="text-[24px]" />
                <p className="text-[13px] text-[#62666F]">
                    The house catalogue: every artwork across all auctions, with its details, pricing and how it sold. Open one for its
                    images, provenance, condition, documents and buyer.
                </p>
            </div>
            <Artworks />
        </div>
    )
}
