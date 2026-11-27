import { apiConnector } from "../apiConnector"
import { adminEndPoints } from "../api"
import type { LiveAccessAuction, LiveAccessPerson, LiveViewerList } from "@/lib/types/liveAccess.types"

const { LIVE_ACCESS_API, LIVE_ACCESS_AUCTION_API, LIVE_ACCESS_VIEWERS_API, LIVE_ACCESS_VIEWER_API, LIVE_ACCESS_CANDIDATES_API } =
    adminEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

/** Upcoming and running auctions, with their live access switch */
export async function getLiveAccessAuctions(token: string | null): Promise<LiveAccessAuction[]> {
    const response = await apiConnector({ method: "GET", url: LIVE_ACCESS_API, header: authHeader(token) })
    return response.data.data
}

/** Turns "only selected bidders while live" on / off; resolves to the server's message */
export async function setLiveAccessRestricted(token: string | null, auctionUuid: string, restricted: boolean): Promise<string> {
    const response = await apiConnector({
        method: "PATCH",
        url: LIVE_ACCESS_AUCTION_API(auctionUuid),
        body: { restricted },
        header: authHeader(token),
    })
    return response.data.message
}

export async function getLiveViewers(token: string | null, auctionUuid: string): Promise<LiveViewerList> {
    const response = await apiConnector({ method: "GET", url: LIVE_ACCESS_VIEWERS_API(auctionUuid), header: authHeader(token) })
    return response.data.data
}

/** Bidders not yet on the auction's list, matching `search` */
export async function searchLiveViewerCandidates(token: string | null, auctionUuid: string, search: string): Promise<LiveAccessPerson[]> {
    const response = await apiConnector({
        method: "GET",
        url: LIVE_ACCESS_CANDIDATES_API(auctionUuid),
        params: { search: search || undefined, limit: 20 },
        header: authHeader(token),
    })
    return response.data.data
}

export async function addLiveViewers(token: string | null, auctionUuid: string, userUuids: string[]): Promise<string> {
    const response = await apiConnector({
        method: "POST",
        url: LIVE_ACCESS_VIEWERS_API(auctionUuid),
        body: { userUuids },
        header: authHeader(token),
    })
    return response.data.message
}

export async function removeLiveViewer(token: string | null, auctionUuid: string, userUuid: string): Promise<string> {
    const response = await apiConnector({ method: "DELETE", url: LIVE_ACCESS_VIEWER_API(auctionUuid, userUuid), header: authHeader(token) })
    return response.data.message
}
