import { apiConnector } from "../apiConnector"
import { auctionEndPoints } from "../api"
import type { ArtworkDetail, ArtworkFilters, ArtworkPage, ArtworkSummary } from "@/lib/types/artwork.types"

const { ARTWORKS_API, ARTWORKS_SUMMARY_API, ARTWORK_API } = auctionEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

// drop empty filters so the URL stays readable
const toParams = (filters: object) =>
    Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "" && value !== "all"))

export async function getArtworks(token: string | null, filters: ArtworkFilters & { page: number; limit: number }): Promise<ArtworkPage> {
    const response = await apiConnector({ method: "GET", url: ARTWORKS_API, params: toParams(filters), header: authHeader(token) })
    return response.data.data
}

export async function getArtworkSummary(token: string | null): Promise<ArtworkSummary> {
    const response = await apiConnector({ method: "GET", url: ARTWORKS_SUMMARY_API, header: authHeader(token) })
    return response.data.data
}

export async function getArtwork(lotUuid: string, token: string | null): Promise<ArtworkDetail> {
    const response = await apiConnector({ method: "GET", url: ARTWORK_API(lotUuid), header: authHeader(token) })
    return response.data.data
}
