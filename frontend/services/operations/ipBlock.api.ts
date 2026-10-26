import { apiConnector } from "../apiConnector"
import { adminEndPoints } from "../api"
import type { IpBlockList } from "@/lib/types/ipBlock.types"

const { IP_BLOCKS_API, IP_BLOCK_API } = adminEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

export async function getIpBlocks(token: string | null): Promise<IpBlockList> {
    const response = await apiConnector({ method: "GET", url: IP_BLOCKS_API, header: authHeader(token) })
    return response.data.data
}

/** Clears the IP's block and failed sign-in count; resolves to the server's message */
export async function unblockIp(token: string | null, ip: string): Promise<string> {
    const response = await apiConnector({ method: "DELETE", url: IP_BLOCK_API(ip), header: authHeader(token) })
    return response.data.message
}

/** Clears every block and failed sign-in count; resolves to the server's message */
export async function unblockAllIps(token: string | null): Promise<string> {
    const response = await apiConnector({ method: "DELETE", url: IP_BLOCKS_API, header: authHeader(token) })
    return response.data.message
}
