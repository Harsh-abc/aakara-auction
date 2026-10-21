// shapes returned by /api/auction/artworks (backend/src/services/artwork.services.js)

import type { AuctionStatus, AuctionType, MediaType } from "./auction.types"
import type { LotStatus } from "./publicAuction.types"

export type ArtworkStage = "all" | "upcoming" | "live" | "sold" | "unsold" | "withdrawn"

export type ArtworkSort = "newest" | "title" | "artist" | "estimate" | "price"

export type ArtworkVisibility = "PUBLIC" | "REGISTERED_USERS_ONLY" | "PRIVATE_INVITE_ONLY"

export interface ArtworkCurrency {
    code: string
    symbol: string | null
}

export interface ArtworkDimensions {
    width: string | null
    height: string | null
    depth: string | null
    unit: "CM" | "INCH" | "MM" | "METER" | "FEET"
}

export interface ArtworkRow {
    uuid: string
    itemNumber: string
    title: string
    artist: string | null
    medium: string | null
    year: string | null
    edition: "UNIQUE" | "LIMITED" | "OPEN"
    dimensions: ArtworkDimensions | null
    status: LotStatus
    isFeatured: boolean
    imageUrl: string | null
    mediaCount: number
    documentCount: number
    /** collectors who saved it to their gallery */
    savedCount: number
    category: string | null
    currency: ArtworkCurrency
    startingPrice: string
    reservePrice: string | null
    estimateLow: string | null
    estimateHigh: string | null
    currentBid: string | null
    bidCount: string
    hammerPrice: string | null
    scheduledStartAt: string
    createdAt: string
    auction: {
        uuid: string
        title: string
        status: AuctionStatus
        visibility: ArtworkVisibility
    }
}

export interface ArtworkPage {
    artworks: ArtworkRow[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface ArtworkFilters {
    search?: string
    auctionUuid?: string
    categoryUuid?: string
    stage: ArtworkStage
    sort: ArtworkSort
}

export interface ArtworkSummary {
    totals: {
        total: number
        artists: number
        upcoming: number
        live: number
        sold: number
        unsold: number
        withdrawn: number
        /** % of offered-and-closed lots that sold; null before any closed */
        sellThroughRate: number | null
    }
    hammerTotals: { currency: ArtworkCurrency; total: string; lots: number }[]
    auctions: { uuid: string; title: string; status: AuctionStatus }[]
    categories: { uuid: string; name: string }[]
}

export interface ArtworkPerson {
    uuid: string
    name: string | null
    paddle: string | null
}

export interface ArtworkDetail extends Omit<ArtworkRow, "auction"> {
    subCategory: string | null
    description: string | null
    catalogue: {
        provenance: string | null
        exhibitionHistory: string | null
        previousOwner: string | null
        acquisitionMethod: string | null
        acquisitionDate: string | null
        authenticatedBy: string | null
        authenticatedOn: string | null
    }
    condition: {
        overall: string | null
        frame: string | null
        report: string | null
        notes: string | null
        restoration: string | null
    }
    insuranceValue: string | null
    scheduledEndAt: string
    updatedAt: string
    media: { url: string; thumbnailUrl: string | null; caption: string | null; mediaType: MediaType }[]
    documents: { documentType: string; fileName: string; fileUrl: string; mimeType: string | null }[]
    interest: {
        registeredBidders: number
        verifiedBidders: number
        proxyBids: number
        savedBy: number
    }
    /** top bidder of a lot that hasn't sold (live, or passed below the reserve) */
    leader: ArtworkPerson | null
    /** a sold lot; older sales have no winner record, so only the hammer price and buyer are known */
    sale: {
        hammerPrice: string | null
        buyerPremium: string | null
        totalDue: string | null
        paymentStatus: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED" | "CANCELLED" | null
        wonAt: string | null
        buyer: ArtworkPerson | null
    } | null
    auction: {
        uuid: string
        title: string
        status: AuctionStatus
        visibility: ArtworkVisibility
        auctionType: AuctionType
        startTime: string
        endTime: string
        category: string | null
    }
}
