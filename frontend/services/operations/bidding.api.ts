import { apiConnector } from "../apiConnector"
import { biddingEndPoints } from "../api"
import type { AuctionActivity, BidResult, MyLotStanding } from "@/lib/types/bidding.types"

const { MY_LOT_STANDING_API, PLACE_BID_API, SET_PROXY_BID_API, AUCTION_ACTIVITY_API } = biddingEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

// the signed-in bidder's registration, position and proxy on one lot
export async function getMyLotStanding(lotUuid: string, token: string | null): Promise<MyLotStanding> {
    const response = await apiConnector({ method: "GET", url: MY_LOT_STANDING_API(lotUuid), header: authHeader(token) })
    return response.data.data
}

// both return the backend message — it says whether the bidder leads or was topped by a proxy
export async function placeBid(lotUuid: string, amount: number, token: string | null): Promise<{ message: string; data: BidResult }> {
    const response = await apiConnector({
        method: "POST",
        url: PLACE_BID_API(lotUuid),
        body: { amount },
        header: authHeader(token),
    })
    return { message: response.data.message, data: response.data.data }
}

export async function setProxyBid(lotUuid: string, maxAmount: number, token: string | null): Promise<{ message: string; data: BidResult }> {
    const response = await apiConnector({
        method: "POST",
        url: SET_PROXY_BID_API(lotUuid),
        body: { maxAmount },
        header: authHeader(token),
    })
    return { message: response.data.message, data: response.data.data }
}

// dashboard: bid feed, totals, top bidders and proxies in play
export async function getAuctionActivity(auctionUuid: string, token: string | null): Promise<AuctionActivity> {
    const response = await apiConnector({ method: "GET", url: AUCTION_ACTIVITY_API(auctionUuid), header: authHeader(token) })
    return response.data.data
}
