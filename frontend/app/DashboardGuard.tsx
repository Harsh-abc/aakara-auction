"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { canAccessDashboard } from "@/lib/constants/roles"
import { refreshSession, SESSION_EXPIRED_EVENT } from "@/services/authSession"

// refresh this long before the access token actually expires
const REFRESH_LEEWAY_MS = 60 * 1000

// read "exp" from the JWT payload (no library needed)
const getTokenExpiry = (token: string): number | null => {
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
        const payload = JSON.parse(atob(base64))
        return payload.exp ? payload.exp * 1000 : null
    } catch {
        return null
    }
}

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)

    const hasAccess = canAccessDashboard(role)

    // 1. refresh token rejected (expired / revoked) → back to login
    useEffect(() => {
        const onSessionExpired = () => {
            toast.error("Session expired. Please log in again.")
            router.replace("/login")
        }
        window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    }, [router])

    // 2. keep the access token fresh: refresh now if missing/expired/unreadable,
    //    otherwise just before it expires. failures are handled via SESSION_EXPIRED_EVENT.
    useEffect(() => {
        const expiresAt = token ? getTokenExpiry(token) : null
        const delay = expiresAt ? Math.max(expiresAt - Date.now() - REFRESH_LEEWAY_MS, 0) : 0

        const timer = setTimeout(() => {
            refreshSession().catch(() => {})
        }, delay)

        return () => clearTimeout(timer)
    }, [token])

    // 3. logged in, but role isn't allowed in the dashboard (e.g. BIDDER)
    useEffect(() => {
        if (token && role && !hasAccess) {
            toast.error("You don't have access to the dashboard")
            router.replace("/")
        }
    }, [token, role, hasAccess, router])

    // render nothing until we have a session with a dashboard role, so protected content never flashes
    if (!token || !hasAccess) return null

    return <>{children}</>
}
