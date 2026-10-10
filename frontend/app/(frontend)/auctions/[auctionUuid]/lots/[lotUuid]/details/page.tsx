import type { Metadata } from "next"

import { LotFullPage } from "@/components/core/frontend/auctions/LotFullPage"
import { publicAuctionEndPoints } from "@/services/api"

type LotDetailsPageProps = {
    params: Promise<{ auctionUuid: string; lotUuid: string }>
}

// "Artist · Title | Sale | Aakara"; falls back quietly if the API can't be reached
export async function generateMetadata({ params }: LotDetailsPageProps): Promise<Metadata> {
    const { auctionUuid, lotUuid } = await params
    try {
        const response = await fetch(publicAuctionEndPoints.GET_PUBLIC_LOT_API(auctionUuid, lotUuid), {
            next: { revalidate: 60 },
        })
        if (response.ok) {
            const { data } = await response.json()
            const heading = [data.lot.artistName, data.lot.title].filter(Boolean).join(" · ")
            return { title: `${heading} | ${data.auction.title} | Aakara`, description: data.auction.short_description ?? undefined }
        }
    } catch {
        // fall through
    }
    return { title: "Lot | Aakara" }
}

export default async function LotDetailsPage({ params }: LotDetailsPageProps) {
    const { auctionUuid, lotUuid } = await params

    return (
        <div className="min-h-svh bg-white">
            {/* keyed so prev / next starts each lot from a clean state */}
            <LotFullPage key={lotUuid} auctionUuid={auctionUuid} lotUuid={lotUuid} />
        </div>
    )
}
