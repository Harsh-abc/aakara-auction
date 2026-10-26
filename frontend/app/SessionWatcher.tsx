"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { readAccessToken } from "@/lib/accessToken"
import { refreshSession, SESSION_EXPIRED_EVENT } from "@/services/authSession"

// the one login page, for bidders and staff alike
const LOGIN_PATH = "/registration"

// pages that handle an expired session themselves: the dashboard (DashboardGuard) and the login page
const SKIP_REDIRECT_PREFIXES = ["/dashboard", LOGIN_PATH]

const matchesPrefix = (pathname: string, prefixes: string[]) =>
    prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))

// refresh this long before the access token actually expires
const REFRESH_LEEWAY_MS = 60 * 1000

const getTokenExpiry = (token: string): number | null => {
    const exp = readAccessToken(token)?.exp
    return exp ? exp * 1000 : null
}

/**
 * Keeps the signed-in session going on every page (storefront and dashboard) and ends it
 * when it runs out. A login lasts 24h: the access token never outlives the session, so
 * near the end the refresh hands back a token that expires with it. Then we wait for it
 * to expire and refresh once more — that is refused, which logs the user out
 * (SESSION_EXPIRED_EVENT) and sends them to /registration (the dashboard's DashboardGuard does the same).
 */
export default function SessionWatcher() {
    const router = useRouter()
    const token = useAppSelector((state) => state.auth.accessToken)
    const user = useAppSelector((state) => state.auth.user)

    // refresh token rejected (expired / revoked) on a storefront page → the storefront login,
    // coming back to the same page once they've logged in again
    useEffect(() => {
        const onSessionExpired = () => {
            const { pathname, search } = window.location
            if (matchesPrefix(pathname, SKIP_REDIRECT_PREFIXES)) return

            toast.error("Session expired. Please log in again.")
            router.replace(`${LOGIN_PATH}?redirect=${encodeURIComponent(pathname + search)}`)
        }
        window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    }, [router])

    // skipped once logged out (no user), so logging out doesn't trigger a failed refresh → "Session expired"
    useEffect(() => {
        if (!user) return

        const expiresAt = token ? getTokenExpiry(token) : null
        const msLeft = expiresAt ? expiresAt - Date.now() : 0
        // plenty of time left: refresh just before expiry. Near the end of the session the new
        // token is just as short-lived, so wait until it actually expires instead of re-refreshing
        const delay = msLeft > 2 * REFRESH_LEEWAY_MS ? msLeft - REFRESH_LEEWAY_MS : Math.max(msLeft, 0)

        const timer = setTimeout(() => {
            refreshSession().catch(() => {})
        }, delay)

        return () => clearTimeout(timer)
    }, [token, user])

    return null
}
