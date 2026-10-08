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

export type PublicLotSort = "lot" | "estimate-asc" | "estimate-desc" | "bid-desc"

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
