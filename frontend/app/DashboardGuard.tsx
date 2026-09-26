"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import toast from "react-hot-toast"

import { logout } from "@/redux/slices/authSlice"
import type { RootState } from "@/redux/store"

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF"]

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
    const dispatch = useDispatch()
    const token = useSelector((state: RootState) => state.auth.accessToken)
    const role = useSelector((state: RootState) => state.auth.role)

    const expiresAt = token ? getTokenExpiry(token) : null
    const isValidToken = !!expiresAt && expiresAt > Date.now()
    const hasRole = !!role && ALLOWED_ROLES.includes(role)

    useEffect(() => {
        const endSession = (message?: string) => {
            dispatch(logout())
            if (message) toast.error(message)
            router.replace("/login")
        }

        // 1. no token or already expired
        if (!isValidToken || !expiresAt) {
            endSession(token ? "Session expired. Please log in again." : undefined)
            return
        }

        // 2. logged in but not staff
        if (!hasRole) {
            toast.error("You don't have access to the dashboard")
            router.replace("/")
            return
        }

        // 3. auto-logout at the exact moment the token expires
        const timer = setTimeout(
            () => endSession("Session expired. Please log in again."),
            expiresAt - Date.now()
        )

        // 4. any API 401 (fired from apiConnector)
        const onUnauthorized = () => endSession("Session expired. Please log in again.")
        window.addEventListener("auth:unauthorized", onUnauthorized)

        return () => {
            clearTimeout(timer)
            window.removeEventListener("auth:unauthorized", onUnauthorized)
        }
    }, [token, role, isValidToken, hasRole, expiresAt, dispatch, router])

    // render nothing while redirecting, so protected content never flashes
    if (!isValidToken || !hasRole) return null

    return <>{children}</>
}