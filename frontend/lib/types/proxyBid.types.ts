// shapes returned by /api/bidding/proxy-bids (backend/src/services/proxyBid.services.js)

import type { AuctionStatus, AuctionType } from "./auction.types"
import type { Currency } from "./bidding.types"
import type { LotStatus } from "./publicAuction.types"

/**
 * WITHDRAWN       taken away with the bidder's access
 * WAITING         the lot hasn't opened — proxies are placed at the hammer
 * LEADING         the lot is live and this bidder holds it
 * IN_PLAY         the lot is live, someone else leads, but the maximum tops them — it's placed at the hammer
 * OUTBID          the bid went past the maximum (or someone else won)
 * WON             the lot sold to this bidder
 * RESERVE_NOT_MET held the lot when it closed, below the reserve
 * LOT_CLOSED      the lot closed without selling
 */
export type ProxyOutcome = "WITHDRAWN" | "WAITING" | "LEADING" | "IN_PLAY" | "OUTBID" | "WON" | "RESERVE_NOT_MET" | "LOT_CLOSED"

export type ProxyStage = "all" | "waiting" | "live" | "closed" | "withdrawn"

export interface ProxyBidRow {
    id: string
    maxAmount: string
    currency: Currency
    outcome: ProxyOutcome
    /** false once the sale ended or the proxy was withdrawn */
    active: boolean
    createdAt: string
    updatedAt: string
    ipAddress: string | null
    userAgent: string | null
    /** different bidders who left proxies from this IP (1 = only this bidder) */
    ipSharedBy: number
    withdrawnAt: string | null
    withdrawnReason: string | null
    bidder: {
        uuid: string
        name: string | null
        username: string
        /** null on a lot's proxy list for staff below admin */
        email: string | null
        phone: string | null
        paddle: string | null
        role: string | null
        accountStatus: string
        kycStatus: string
        location: string | null
    }
    lot: {
        uuid: string
        itemNumber: string
        title: string
        status: LotStatus
        startingPrice: string | null
        reservePrice: string | null
        estimateLow: string | null
        estimateHigh: string | null
        scheduledStartAt: string
        currentBid: string | null
        bidCount: string
        leading: boolean
        hammerPrice: string | null
    }
    auction: { uuid: string; title: string; status: AuctionStatus; auctionType: AuctionType }
    /** bids the proxy placed for its owner, and the highest of them */
    proxyBids: { count: number; highest: string | null }
}

/** GET /api/bidding/lots/:lotUuid/proxies — strongest first, withdrawn last */
export interface LotProxies {
    /** IP, device, email and phone are included (super admin / admin) */
    canSeeOrigin: boolean
    proxies: ProxyBidRow[]
}

export interface ProxyBidPage {
    proxies: ProxyBidRow[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface ProxyBidSummary {
    totals: {
        total: number
        waiting: number
        live: number
        won: number
        withdrawn: number
        bidders: number
        uniqueIps: number
        /** IPs that more than one bidder left proxies from */
        sharedIps: number
    }
    /** auctions with proxy bids, newest first */
    auctions: { uuid: string; title: string; status: AuctionStatus; startTime: string }[]
}

/** GET /api/bidding/proxy-bids/settings — upcoming and running auctions, soonest first */
export interface ProxySettingsAuction {
    uuid: string
    title: string
    status: AuctionStatus
    startTime: string
    proxyBiddingEnabled: boolean
    /** lots that haven't opened yet — the only ones that can take a proxy */
    upcomingLots: number
}

export interface ProxyBidFilters {
    search?: string
    auctionUuid?: string
    stage?: ProxyStage
    ip?: string
    userUuid?: string
}
