import { LotFullPage } from "@/components/core/frontend/auctions/LotFullPage"

type LotPreviewPageProps = {
    params: Promise<{ auctionUuid: string; lotUuid: string }>
}

export const metadata = { title: "Lot preview | Akara" }

// Dashboard "Preview lot": the storefront lot page, as bidders will see it, for any sale (drafts too)
export default async function LotPreviewPage({ params }: LotPreviewPageProps) {
    const { auctionUuid, lotUuid } = await params

    return (
        // the storefront's typeface (the public site sets it on .site-frontend)
        <div className="min-h-svh bg-white" style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}>
            {/* keyed so prev / next starts each lot from a clean state */}
            <LotFullPage key={lotUuid} auctionUuid={auctionUuid} lotUuid={lotUuid} preview />
        </div>
    )
}
