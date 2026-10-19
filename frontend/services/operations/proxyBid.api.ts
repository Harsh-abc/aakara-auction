import { apiConnector } from "../apiConnector"
import { biddingEndPoints } from "../api"
import type { LotProxies, ProxyBidFilters, ProxyBidPage, ProxyBidSummary } from "@/lib/types/proxyBid.types"

const { PROXY_BIDS_API, PROXY_BIDS_SUMMARY_API, PROXY_BIDS_EXPORT_API, LOT_PROXIES_API } = biddingEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

// drop empty filters so the URL stays readable
const toParams = (filters: ProxyBidFilters) =>
    Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "" && value !== "all"))

export async function getProxyBids(token: string | null, filters: ProxyBidFilters & { page: number; limit: number }): Promise<ProxyBidPage> {
    const response = await apiConnector({ method: "GET", url: PROXY_BIDS_API, params: toParams(filters), header: authHeader(token) })
    return response.data.data
}

export async function getProxyBidSummary(token: string | null, auctionUuid?: string): Promise<ProxyBidSummary> {
    const response = await apiConnector({
        method: "GET",
        url: PROXY_BIDS_SUMMARY_API,
        params: toParams({ auctionUuid }),
        header: authHeader(token),
    })
    return response.data.data
}

// one lot's proxy bids, strongest first (bid history, console)
export async function getLotProxies(lotUuid: string, token: string | null): Promise<LotProxies> {
    const response = await apiConnector({ method: "GET", url: LOT_PROXIES_API(lotUuid), header: authHeader(token) })
    return response.data.data
}

// CSV of the filtered proxy bids (newest 10,000), saved by the browser
export async function downloadProxyBids(token: string | null, filters: ProxyBidFilters): Promise<void> {
    const response = await apiConnector<Blob>({
        method: "GET",
        url: PROXY_BIDS_EXPORT_API,
        params: toParams(filters),
        header: authHeader(token),
        responseType: "blob",
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement("a")
    link.href = url
    link.download = `proxy-bids-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
}
