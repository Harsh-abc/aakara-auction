import type { AuctionStatus } from "@/lib/types/auction.types"

export const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    PREVIEW: "Preview",
    LIVE: "Live",
    PAUSED: "Paused",
    ENDED: "Ended",
    SETTLED: "Settled",
    CANCELLED: "Cancelled",
}

// must match AUCTION_STATUS_TRANSITIONS in backend/src/services/auction.services.js
export const AUCTION_STATUS_TRANSITIONS: Record<AuctionStatus, AuctionStatus[]> = {
    DRAFT: ["SCHEDULED", "CANCELLED"],
    SCHEDULED: ["DRAFT", "PREVIEW", "LIVE", "CANCELLED"],
    PREVIEW: ["SCHEDULED", "LIVE", "CANCELLED"],
    LIVE: ["PAUSED", "ENDED", "CANCELLED"],
    PAUSED: ["LIVE", "ENDED", "CANCELLED"],
    ENDED: ["SETTLED"],
    SETTLED: [],
    CANCELLED: ["DRAFT"],
}
