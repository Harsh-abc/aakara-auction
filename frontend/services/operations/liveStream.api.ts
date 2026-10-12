import { apiConnector } from "../apiConnector"
import { liveStreamEndPoints } from "../api"

const { VIEWER_TOKEN_API, HOST_TOKEN_API, ON_AIR_API, REMOVE_VIEWER_API, BANS_API, UNBAN_API } = liveStreamEndPoints

export type LiveStreamAccess = {
    /** LiveKit server, wss://… */
    url: string
    token: string
}

export type HostStreamAccess = LiveStreamAccess & {
    auction: { uuid: string; title: string; status: string }
}

export type OnAirStreams = {
    /** false until LIVEKIT_* are set on the backend */
    configured: boolean
    auctions: { uuid: string; title: string; viewers: number }[]
}

export type LiveStreamBan = {
    identity: string
    name: string | null
    createdAt: string
    bannedBy: string | null
}

const auth = (token: string | null) => ({ Authorization: `Bearer ${token}` })

// watch-only access to the auction's stream; signed-in viewers pass their token so the auctioneer sees their name
export async function getLiveStreamToken(auctionUuid: string, viewerId: string, accessToken?: string | null): Promise<LiveStreamAccess> {
    const response = await apiConnector({
        method: "GET",
        url: VIEWER_TOKEN_API(auctionUuid),
        params: { viewerId },
        header: accessToken ? auth(accessToken) : undefined,
    })
    return response.data.data
}

// ---------------- dashboard studio ----------------

export async function getHostStreamToken(auctionUuid: string, token: string | null): Promise<HostStreamAccess> {
    const response = await apiConnector({ method: "POST", url: HOST_TOKEN_API(auctionUuid), header: auth(token) })
    return response.data.data
}

export async function getOnAirStreams(token: string | null): Promise<OnAirStreams> {
    const response = await apiConnector({ method: "GET", url: ON_AIR_API, header: auth(token) })
    return response.data.data
}

// ban = also block them from rejoining this auction's stream
export async function removeStreamViewer(
    auctionUuid: string,
    identity: string,
    { ban, name }: { ban: boolean; name?: string },
    token: string | null
): Promise<string> {
    const response = await apiConnector({
        method: "POST",
        url: REMOVE_VIEWER_API(auctionUuid, identity),
        body: { ban, name },
        header: auth(token),
    })
    return response.data.message
}

export async function getStreamBans(auctionUuid: string, token: string | null): Promise<LiveStreamBan[]> {
    const response = await apiConnector({ method: "GET", url: BANS_API(auctionUuid), header: auth(token) })
    return response.data.data
}

export async function unbanStreamViewer(auctionUuid: string, identity: string, token: string | null): Promise<string> {
    const response = await apiConnector({ method: "DELETE", url: UNBAN_API(auctionUuid, identity), header: auth(token) })
    return response.data.message
}
