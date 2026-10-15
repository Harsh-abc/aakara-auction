import { apiConnector } from "../apiConnector"
import { auctionEndPoints, biddingEndPoints } from "../api"
import type { AuctionActivity, AuctionConsole, BidResult, HammerResult, MyLotStanding } from "@/lib/types/bidding.types"

const { MY_LOT_STANDING_API, PLACE_BID_API, SET_PROXY_BID_API, AUCTION_ACTIVITY_API, AUCTION_CONSOLE_API, FLOOR_BID_API } =
    biddingEndPoints
const { HAMMER_LOT_API } = auctionEndPoints

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

// console: the sale's live lot, its position, bid log and floor paddles
export async function getAuctionConsole(auctionUuid: string, token: string | null): Promise<AuctionConsole> {
    const response = await apiConnector({ method: "GET", url: AUCTION_CONSOLE_API(auctionUuid), header: authHeader(token) })
    return response.data.data
}

// console: a bid the auctioneer enters for a paddle in the room
export async function placeFloorBid(
    lotUuid: string,
    paddleNumber: string,
    amount: number,
    token: string | null
): Promise<{ message: string; data: BidResult }> {
    const response = await apiConnector({
        method: "POST",
        url: FLOOR_BID_API(lotUuid),
        body: { paddleNumber, amount },
        header: authHeader(token),
    })
    return { message: response.data.message, data: response.data.data }
}

// console: sell the live lot to its leader — bidCount is what the auctioneer saw, so a later bid stops it
export async function hammerLot(lotUuid: string, bidCount: number, token: string | null): Promise<{ message: string; data: HammerResult }> {
    const response = await apiConnector({
        method: "POST",
        url: HAMMER_LOT_API(lotUuid),
        body: { bidCount },
        header: authHeader(token),
    })
    return { message: response.data.message, data: response.data.data }
}
