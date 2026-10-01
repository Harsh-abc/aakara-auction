import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

import { axiosInstance } from "./apiConnector"
import { authEndPoints } from "./api"
import { store } from "@/redux/store"
import { logout, setPermissions, setRole, setToken } from "@/redux/slices/authSlice"
import { RefreshTokenApiResponse } from "@/lib/types/auth.types"

const { REFRESH_API } = authEndPoints

// fired when the refresh token is rejected — DashboardGuard listens and redirects to /login
export const SESSION_EXPIRED_EVENT = "auth:session-expired"

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let refreshInFlight: Promise<string> | null = null

const endSession = () => {
    store.dispatch(logout())
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

// get a new access token using the httpOnly refresh cookie.
// concurrent callers share one request, so the rotated refresh token is only used once.
export function refreshSession(): Promise<string> {
    if (!refreshInFlight) {
        refreshInFlight = axios
            .post<RefreshTokenApiResponse>(REFRESH_API, null, { withCredentials: true })
            .then(({ data }) => {
                // refresh response has no profile, so keep the stored user as-is
                store.dispatch(setToken(data.data.accessToken))
                store.dispatch(setRole(data.data.role))
                store.dispatch(setPermissions(data.data.permissions))
                return data.data.accessToken
            })
            .catch((error) => {
                // only a rejected refresh token ends the session — not a network blip
                const status = axios.isAxiosError(error) ? error.response?.status : undefined
                if (status === 401 || status === 403) endSession()
                throw error
            })
            .finally(() => {
                refreshInFlight = null
            })
    }
    return refreshInFlight
}

// on a 401 for an authenticated request: refresh once, then replay the request with the new token
const onResponseError = async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const sentToken = !!original?.headers?.Authorization

    if (error.response?.status !== 401 || !original || !sentToken || original._retried) {
        return Promise.reject(error)
    }

    original._retried = true

    try {
        const token = await refreshSession()
        original.headers.set("Authorization", `Bearer ${token}`)
        return axiosInstance(original)
    } catch {
        return Promise.reject(error)
    }
}

let installed = false

export function setupAuthInterceptors() {
    if (installed || typeof window === "undefined") return
    installed = true
    axiosInstance.interceptors.response.use((response) => response, onResponseError)
}
