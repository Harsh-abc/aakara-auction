import type { AuctionStatus } from "./auction.types"
import type { LotStatus, PublicBid } from "./publicAuction.types"

// money and counts arrive as strings, like the rest of the API

export type Currency = { code: string; symbol: string | null }

export type LotRegistration = "NOT_REGISTERED" | "PENDING" | "VERIFIED"

// GET /api/bidding/lots/:lotUuid/me
export interface MyLotStanding {
    lotUuid: string
    itemNumber: string
    title: string
    status: LotStatus
    auctionStatus: AuctionStatus
    currency: Currency
    registration: LotRegistration
    paddleNumber: string | null
    currentBid: string | null
    bidCount: string
    /** null once bidding is over */
    nextBid: string | null
    leading: boolean
    /** the bidder's proxy (maximum) bid on this lot */
    proxyMax: string | null
    canBid: boolean
    canProxy: boolean
}

// POST /bids and /proxy
export interface BidResult {
    lotUuid: string
    itemNumber: string
    status: LotStatus
    currency: Currency
    currentBid: string | null
    bidCount: string
    nextBid: string
    leading: boolean
    proxyMax: string | null
    /** bids this call put on the ladder (including proxies that answered) */
    bidsPlaced: number
}

// ---------------------------------------------------------------------
// socket events
// ---------------------------------------------------------------------

/** "lot:update" — a lot's new position. A status-only update carries just the ids and status. */
export interface LiveLotUpdate {
    auctionUuid: string
    lotUuid: string
    itemNumber: string
    status: LotStatus
    currency?: Currency
    currentBid?: string | null
    bidCount?: string
    nextBid?: string
    leadingPaddle?: string | null
    /** new bids, newest first */
    bids?: PublicBid[]
}

/** "auction:status" */
export interface LiveAuctionStatus {
    auctionUuid: string
    status: AuctionStatus
}

/** "bid:outbid" — sent only to the bidder who lost the lead */
export interface OutbidNotice {
    auctionUuid: string
    lotUuid: string
    itemNumber: string
    title: string
    currentBid: string | null
    nextBid: string
    currency: Currency
}

// ---------------------------------------------------------------------
// dashboard
// ---------------------------------------------------------------------

export interface BidderRef {
    uuid: string | null
    paddle: string | null
    name: string | null
}

export interface StaffBid extends PublicBid {
    bidder: BidderRef | null
}

export interface BiddingStats {
    totalBids: number
    manualBids: number
    proxyBids: number
    bidders: number
}

/** "bid:new" — staff room only */
export interface StaffBidEvent extends Required<Omit<LiveLotUpdate, "bids">> {
    title: string
    bids: StaffBid[]
    stats: BiddingStats
}

export interface ActivityFeedItem extends StaffBid {
    lotUuid: string
    itemNumber: string
    title: string | null
}

export interface ActiveProxy {
    lotUuid: string
    itemNumber: string
    title: string | null
    maxAmount: string
    currency: Currency
    placedAt: string
    leading: boolean
    bidder: BidderRef | null
}

// GET /api/bidding/auctions/:auctionUuid/activity
export interface AuctionActivity {
    auction: { uuid: string; title: string; status: AuctionStatus; currency: Currency }
    stats: BiddingStats & { recentBids: number; proxiesInPlay: number }
    feed: ActivityFeedItem[]
    topBidders: { bidder: BidderRef | null; bids: number }[]
    proxies: ActiveProxy[]
}
