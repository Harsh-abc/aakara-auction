import { useEffect, useState } from "react"

import { getPublicAuctions } from "@/services/operations/publicAuction.api"

// one request per page load, shared by the auction tabs, the menu and the footer
let pastAuctionsCheck: Promise<boolean> | null = null

// has any sale closed yet? null while checking — "Past" tabs and links stay hidden until one has
export function useHasPastAuctions(): boolean | null {
    const [hasPast, setHasPast] = useState<boolean | null>(null)

    useEffect(() => {
        let cancelled = false

        pastAuctionsCheck ??= getPublicAuctions({ type: "past", page: 1, limit: 1 })
            .then((data) => data.pagination.total > 0)
            .catch(() => {
                pastAuctionsCheck = null // try again on the next mount
                return false
            })
        pastAuctionsCheck.then((value) => {
            if (!cancelled) setHasPast(value)
        })

        return () => {
            cancelled = true
        }
    }, [])

    return hasPast
}
