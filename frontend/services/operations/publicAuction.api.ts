import { apiConnector } from "../apiConnector"
import { publicAuctionEndPoints } from "../api"
import {
    AuctionRegistrationResult,
    GetPublicAuctionsParams,
    GetPublicLotsParams,
    PublicAuction,
    PublicAuctionsPage,
    PublicLotsPage,
} from "@/lib/types/publicAuction.types"

const {
    GET_PUBLIC_AUCTIONS_API,
    GET_FEATURED_AUCTION_API,
    GET_PUBLIC_AUCTION_API,
    GET_PUBLIC_LOTS_API,
    REGISTER_FOR_AUCTION_API,
} = publicAuctionEndPoints

// live sale, otherwise the next one to open; null when nothing is scheduled
export async function getFeaturedAuction(): Promise<PublicAuction | null> {
    const response = await apiConnector({ method: "GET", url: GET_FEATURED_AUCTION_API })
    return response.data.data
}

export async function getPublicAuctions({ type, search, page = 1, limit = 10 }: GetPublicAuctionsParams): Promise<PublicAuctionsPage> {
    const response = await apiConnector({
        method: "GET",
        url: GET_PUBLIC_AUCTIONS_API,
        params: { type, page, limit, search: search || undefined },
    })
    return response.data.data
}

export async function getPublicAuction(auctionUuid: string): Promise<PublicAuction> {
    const response = await apiConnector({ method: "GET", url: GET_PUBLIC_AUCTION_API(auctionUuid) })
    return response.data.data
}

export async function getPublicLots({ auctionUuid, search, sort = "lot", page = 1, limit = 12 }: GetPublicLotsParams): Promise<PublicLotsPage> {
    const response = await apiConnector({
        method: "GET",
        url: GET_PUBLIC_LOTS_API(auctionUuid),
        params: { sort, page, limit, search: search || undefined },
    })
    return response.data.data
}

// returns the backend message too — it carries the paddle number
export async function registerForAuction(
    auctionUuid: string,
    token: string | null
): Promise<{ message: string; data: AuctionRegistrationResult }> {
    const response = await apiConnector({
        method: "POST",
        url: REGISTER_FOR_AUCTION_API(auctionUuid),
        header: { Authorization: `Bearer ${token}` },
    })
    return { message: response.data.message, data: response.data.data }
}
