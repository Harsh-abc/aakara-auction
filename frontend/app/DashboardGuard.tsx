"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { dashboardMfaUntil } from "@/lib/accessToken"
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
    // this login entered its Google Authenticator code in the last 6 hours (the API refuses the
    // dashboard without one). `now` moves on when the code runs out, so the page closes on time
    const mfaUntil = dashboardMfaUntil(token)
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (!mfaUntil) return
        // setTimeout can't wait longer than ~24.8 days — far beyond a 6-hour code
        const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(mfaUntil - Date.now(), 0) + 500, 2 ** 31 - 1))
        return () => clearTimeout(timer)
    }, [mfaUntil])
    const mfaDone = (mfaUntil ?? 0) > now
    // had a code, and its 6 hours are up (rather than never entered one on this login)
    const mfaExpired = mfaUntil !== null && !mfaDone
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

    // 3. a dashboard role without an authenticator code from the last 6 hours → the code page
    //    (also after a super admin resets their authenticator), coming back here afterwards
    useEffect(() => {
        if (token && hasAccess && !mfaDone) {
            if (mfaExpired) toast("For security, enter a new authenticator code to keep using the dashboard.")
            const { pathname, search } = window.location
            router.replace(`/authenticator?redirect=${encodeURIComponent(pathname + search)}${mfaExpired ? "&expired=1" : ""}`)
        }
    }, [token, hasAccess, mfaDone, mfaExpired, router])

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
