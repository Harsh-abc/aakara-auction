// shapes returned by GET /api/admin/added-bidders (backend getAdminAddedBiddersService)
import type { AuctionStatus } from "@/lib/types/auction.types"

export interface AddedBidderAuction {
    uuid: string
    title: string
    status: AuctionStatus
    startTime: string
}

export interface AddedBidderRegistration {
    paddleNumber: string
    registeredAt: string
    auction: AddedBidderAuction
}

export interface AddedBidder {
    uuid: string
    username: string
    email: string
    phone: string | null
    name: string | null
    avatarUrl: string | null
    role: string
    kycStatus: string
    status: string
    createdAt: string
    /** the super admin who created the account */
    createdBy: string | null
    registrations: AddedBidderRegistration[]
}

export interface AddedBiddersPage {
    bidders: AddedBidder[]
    /** auctions a bidder can still be registered for (not ended), soonest first */
    auctions: AddedBidderAuction[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
}
