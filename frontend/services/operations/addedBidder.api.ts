import { apiConnector } from "../apiConnector"
import { adminEndPoints, auctionEndPoints } from "../api"
import type { AddedBiddersPage } from "@/lib/types/addedBidder.types"

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

// super admin: bidder accounts created by staff, with their auctions and paddles
export async function getAddedBidders(
    token: string | null,
    params: { page: number; limit: number; search?: string }
): Promise<AddedBiddersPage> {
    const response = await apiConnector({
        method: "GET",
        url: adminEndPoints.ADDED_BIDDERS_API,
        params: params.search ? params : { page: params.page, limit: params.limit },
        header: authHeader(token),
    })
    return response.data.data
}

// super admin: register a bidder for an auction — they get a paddle and are verified on every lot
export async function registerBidderForAuction(
    auctionUuid: string,
    userUuid: string,
    token: string | null
): Promise<{ message: string }> {
    const response = await apiConnector({
        method: "POST",
        url: auctionEndPoints.AUCTION_PARTICIPANTS_API(auctionUuid),
        body: { userUuids: [userUuid] },
        header: authHeader(token),
    })
    return response.data
}

// super admin: take a bidder off an auction — paddle, lot verifications and their proxy bids go
export async function removeBidderFromAuction(
    auctionUuid: string,
    userUuid: string,
    token: string | null
): Promise<{ message: string }> {
    const response = await apiConnector({
        method: "DELETE",
        url: auctionEndPoints.AUCTION_PARTICIPANTS_API(auctionUuid),
        body: { userUuids: [userUuid] },
        header: authHeader(token),
    })
    return response.data
}
