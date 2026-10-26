"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { hasDashboardMfa } from "@/lib/accessToken"
import { canAccessPage } from "@/lib/constants/dashboardAccess"
import { canAccessDashboard } from "@/lib/constants/roles"
import { SESSION_EXPIRED_EVENT } from "@/services/authSession"

// keeping the access token fresh (and ending the session after 24h) is SessionWatcher's job (app/providers.tsx)
export default function DashboardGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)

    const pathname = usePathname()

    const hasAccess = canAccessDashboard(role)
    // this login entered its Google Authenticator code (the API refuses the dashboard without it)
    const mfaDone = hasDashboardMfa(token)
    // which pages each role can open: lib/constants/dashboardAccess.ts
    const pageAllowed = canAccessPage(pathname, role)

    // 1. refresh token rejected (expired / revoked) → back to login, returning to this page afterwards
    useEffect(() => {
        const onSessionExpired = () => {
            toast.error("Session expired. Please log in again.")
            const { pathname, search } = window.location
            router.replace(`/registration?redirect=${encodeURIComponent(pathname + search)}`)
        }
        window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    }, [router])

    // 2. logged in, but role isn't allowed in the dashboard (e.g. BIDDER)
    useEffect(() => {
        if (token && role && !hasAccess) {
            toast.error("You don't have access to the dashboard")
            router.replace("/")
        }
    }, [token, role, hasAccess, router])

    // 3. a dashboard role that hasn't entered its authenticator code on this login → the code
    //    page (also after a super admin resets their authenticator), coming back here afterwards
    useEffect(() => {
        if (token && hasAccess && !mfaDone) {
            const { pathname, search } = window.location
            router.replace(`/authenticator?redirect=${encodeURIComponent(pathname + search)}`)
        }
    }, [token, hasAccess, mfaDone, router])

    // 4. a dashboard role on a page it can't open (typed URL, old link) → its dashboard home
    useEffect(() => {
        if (token && hasAccess && mfaDone && !pageAllowed) {
            toast.error("You don't have access to that page")
            router.replace("/dashboard")
        }
    }, [token, hasAccess, mfaDone, pageAllowed, router])

    // render nothing until we have a verified session with a dashboard role, so protected content never flashes
    if (!token || !hasAccess || !mfaDone || !pageAllowed) return null

    return <>{children}</>
}
