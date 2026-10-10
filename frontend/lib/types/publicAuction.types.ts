import type { AuctionStatus, AuctionType } from "./auction.types"

// shape of GET /api/auction/public and /public/featured
export interface PublicAuction {
    uuid: string
    title: string
    slug: string
    short_description: string | null
    coverImageUrl: string | null
    status: AuctionStatus
    auctionType: AuctionType
    startTime: string
    endTime: string
    timezone: string
    isOnline: boolean
    venue: string | null
    registrationRequired: boolean
    registrationStarts: string | null
    registrationDeadline: string | null
    category: { name: string } | null
    currency: { code: string; symbol: string | null }
    lotCount: number
    /** only on GET /public/:auctionUuid */
    description?: string | null
    /** only on GET /public/:auctionUuid — plain text, shown before registering */
    termsAndConditions?: string | null
}

export type LotStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "SOLD" | "UNSOLD" | "PASSED" | "WITHDRAWN"

// money and counts arrive as strings (Decimal / BigInt on the server)
export interface PublicLot {
    uuid: string
    itemNumber: string
    title: string
    artistName: string | null
    medium: string | null
    yearCreated: string | null
    status: LotStatus
    startingPrice: string
    estimateLow: string | null
    estimateHigh: string | null
    currentBid: string | null
    bidCount: string
    scheduledStartAt: string
    scheduledEndAt: string
    currency: { code: string; symbol: string | null }
    dimension: { width: string | null; height: string | null; depth: string | null; dimensionUnit: string } | null
    image: string | null
}

// one rung of the bid ladder — bidders stay anonymous
export interface PublicBid {
    uuid: string
    amount: string
    source: "MANUAL" | "PROXY"
    placedAt: string
}

export interface PublicLotMedia {
    url: string
    thumbnailUrl: string | null
    caption: string | null
    mediaType: "IMAGE" | "VIDEO"
}

// shape of lot on GET /api/auction/public/:auctionUuid/lots/:lotUuid
export interface PublicLotDetail extends PublicLot {
    description: string | null
    editionType: "UNIQUE" | "LIMITED" | "OPEN"
    /** sub-category / category name, e.g. "Painting" */
    artworkType: string | null
    provenance: string | null
    previousOwner: string | null
    /** PURCHASE | INHERITANCE | GIFT | AUCTION | COMMISSION | OTHER */
    acquisitionMethod: string | null
    /** "YYYY-MM-DD" */
    acquisitionDate: string | null
    authenticateBy: string | null
    authenticatedAt: string | null
    overallCondition: string | null
    frameCondition: string | null
    conditionReport: string | null
    detailedConditionNotes: string | null
    restorationHistory: string | null
    exhibitionHistory: string | null
    media: PublicLotMedia[]
    /** paddle of the bidder holding the current bid */
    leadingPaddle: string | null
    /** smallest amount the next bid may be */
    nextBid: string
    /** highest first — the first one is leading */
    bids: PublicBid[]
}

export interface PublicLotPage {
    auction: PublicAuction & { auctioneer: string | null }
    lot: PublicLotDetail
    /** every lot in the sale, in lot order */
    lots: PublicLot[]
}

export type PublicLotSort ="lot" | "estimate-asc" | "estimate-desc" | "bid-desc"

export interface GetPublicLotsParams {
    auctionUuid: string
    search?: string
    sort?: PublicLotSort
    page?: number
    limit?: number
}

export interface PublicLotsPage {
    lots: PublicLot[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
}

export type PublicAuctionTab = "upcoming" | "past"

export interface GetPublicAuctionsParams {
    type: PublicAuctionTab
    search?: string
    page?: number
    limit?: number
}

export interface PublicAuctionsPage {
    auctions: PublicAuction[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface AuctionRegistrationResult {
    auctionUuid: string
    paddleNumber: string
}
