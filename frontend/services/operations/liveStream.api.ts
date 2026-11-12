import { apiConnector } from "../apiConnector"
import { liveStreamEndPoints } from "../api"

const { VIEWER_TOKEN_API, WATCH_ACCESS_API, HOST_TOKEN_API, ON_AIR_API, ANNOUNCE_API, REMOVE_VIEWER_API, BANS_API, UNBAN_API, WATCHERS_API } = liveStreamEndPoints

export type LiveStreamAccess = {
    /** LiveKit server, wss://… */
    url: string
    token: string
}

/** why the live room is closed to this user — SIGN_IN, REGISTER, PENDING, NOT_BIDDER */
export type WatchAccess = {
    allowed: boolean
    code: "OK" | "SIGN_IN" | "REGISTER" | "PENDING" | "NOT_BIDDER"
    message: string | null
}

export type HostStreamAccess = LiveStreamAccess & {
    auction: { uuid: string; title: string; status: string }
}

export type OnAirStreams = {
    /** false until LIVEKIT_* are set on the backend */
    configured: boolean
    auctions: { uuid: string; title: string; viewers: number }[]
}

export type LiveStreamWatcher = {
    /** the user's uuid — /dashboard/users/{uuid} */
    uuid: string
    /** their LiveKit identity, "user-<uuid>" */
    identity: string
    name: string
    email: string
    kind: "bidder" | "staff"
    paddleNumber: string | null
    userAgent: string
    /** when their first open tab joined (ISO) */
    joinedAt: string
    tabs: number
}

export type LiveStreamBan = {
    identity: string
    name: string | null
    createdAt: string
    bannedBy: string | null
}

const auth = (token: string | null) => ({ Authorization: `Bearer ${token}` })

// may this user open the live room? (eligible bidders and staff only)
export async function getWatchAccess(auctionUuid: string, accessToken?: string | null): Promise<WatchAccess> {
    const response = await apiConnector({
        method: "GET",
        url: WATCH_ACCESS_API(auctionUuid),
        header: accessToken ? auth(accessToken) : undefined,
    })
    return response.data.data
}

// watch-only access to the auction's stream — eligible bidders only, and only once the auctioneer is publishing
export async function getLiveStreamToken(auctionUuid: string, accessToken?: string | null): Promise<LiveStreamAccess> {
    const response = await apiConnector({
        method: "GET",
        url: VIEWER_TOKEN_API(auctionUuid),
        header: accessToken ? auth(accessToken) : undefined,
    })
    return response.data.data
}

// ---------------- dashboard studio ----------------

export async function getHostStreamToken(auctionUuid: string, token: string | null): Promise<HostStreamAccess> {
    const response = await apiConnector({ method: "POST", url: HOST_TOKEN_API(auctionUuid), header: auth(token) })
    return response.data.data
}

// the studio went on air — the backend checks LiveKit and pushes "live:on-air" to waiting players
export async function announceOnAir(auctionUuid: string, token: string | null): Promise<void> {
    await apiConnector({ method: "POST", url: ANNOUNCE_API(auctionUuid), header: auth(token) })
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

// signed-in bidders / staff with the live room page open right now (one row per account)
export async function getStreamWatchers(auctionUuid: string, token: string | null): Promise<LiveStreamWatcher[]> {
    const response = await apiConnector({ method: "GET", url: WATCHERS_API(auctionUuid), header: auth(token) })
    return response.data.data
}

export async function unbanStreamViewer(auctionUuid: string, identity: string, token: string | null): Promise<string> {
    const response = await apiConnector({ method: "DELETE", url: UNBAN_API(auctionUuid, identity), header: auth(token) })
    return response.data.message
}
