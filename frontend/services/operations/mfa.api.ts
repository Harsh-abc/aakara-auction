import { apiConnector } from "../apiConnector"
import { adminEndPoints, authEndPoints } from "../api"
import { store } from "@/redux/store"
import { setPermissions, setRole, setToken } from "@/redux/slices/authSlice"
import type { RefreshTokenApiResponse } from "@/lib/types/auth.types"
import type { MfaSetup, MfaStatus } from "@/lib/types/mfa.types"

// Google Authenticator before the dashboard opens (backend libs/dashboardMfa.js)

const { MFA_STATUS_API, MFA_SETUP_API, MFA_VERIFY_API } = authEndPoints
const { RESET_USER_MFA_API } = adminEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

export async function getMfaStatus(token: string | null): Promise<MfaStatus> {
    const response = await apiConnector({ method: "GET", url: MFA_STATUS_API, header: authHeader(token) })
    return response.data.data
}

/** First visit: the QR code (and key) to add to the app */
export async function startMfaSetup(token: string | null): Promise<MfaSetup> {
    const response = await apiConnector({ method: "POST", url: MFA_SETUP_API, header: authHeader(token) })
    return response.data.data
}

/**
 * Sends the 6-digit code. On success the API hands back a token that opens the
 * dashboard (and rotates the refresh cookie); it goes into the store like a refresh.
 */
export async function verifyMfaCode(token: string | null, code: string): Promise<string> {
    const response = await apiConnector<RefreshTokenApiResponse>({
        method: "POST",
        url: MFA_VERIFY_API,
        body: { code },
        header: authHeader(token),
    })
    const { data } = response.data
    store.dispatch(setToken(data.accessToken))
    store.dispatch(setRole(data.role))
    store.dispatch(setPermissions(data.permissions))
    return response.data.message ?? "Code accepted"
}

/** Super admin: removes a user's authenticator so they scan a new QR code; resolves to the server's message */
export async function resetUserMfa(token: string | null, uuid: string): Promise<string> {
    const response = await apiConnector({ method: "DELETE", url: RESET_USER_MFA_API(uuid), header: authHeader(token) })
    return response.data.message
}
