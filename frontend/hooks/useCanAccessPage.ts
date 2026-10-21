import { useCallback } from "react"

import { useAppSelector } from "@/hooks/redux"
import { canAccessPage } from "@/lib/constants/dashboardAccess"

/** `(href) => boolean` for the signed-in role — hide links to dashboard pages the role can't open */
export function useCanAccessPage() {
    const role = useAppSelector((state) => state.auth.role)
    return useCallback((href: string) => canAccessPage(href, role), [role])
}
