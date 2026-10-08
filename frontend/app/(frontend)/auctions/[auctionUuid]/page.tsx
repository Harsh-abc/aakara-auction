import type { Metadata } from "next"

import { AuctionDetail } from "@/components/core/frontend/auctions/detail/AuctionDetail"
import { publicAuctionEndPoints } from "@/services/api"

type AuctionPageProps = {
    params: Promise<{ auctionUuid: string }>
}

// sale title in the tab; falls back quietly if the API can't be reached at build/request time
export async function generateMetadata({ params }: AuctionPageProps): Promise<Metadata> {
    const { auctionUuid } = await params
    try {
        const response = await fetch(publicAuctionEndPoints.GET_PUBLIC_AUCTION_API(auctionUuid), {
            next: { revalidate: 60 },
        })
        if (response.ok) {
            const { data } = await response.json()
            return { title: `${data.title} | Aakara`, description: data.short_description ?? undefined }
        }
    } catch {
        // fall through
    }
    return { title: "Auction | Aakara" }
}

export default async function AuctionPage({ params }: AuctionPageProps) {
    const { auctionUuid } = await params

    return (
        <div className="min-h-svh bg-white">
            {/* keyed so moving between sales starts from a clean state */}
            <AuctionDetail key={auctionUuid} auctionUuid={auctionUuid} />
        </div>
    )
}
