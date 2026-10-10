"use client"

import { usePathname, useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"

export type BidKind = "bid" | "proxy"

// guests sign in first and come back to this lot.
// TODO: wire to the bidding API once it exists — there's no place-bid endpoint yet
export function useBidAction() {
    const router = useRouter()
    const pathname = usePathname()
    const token = useAppSelector((state) => state.auth.accessToken)

    return (kind: BidKind) => {
        if (!token) {
            router.push(`/registration?redirect=${encodeURIComponent(pathname)}`)
            return
        }
        toast(kind === "proxy" ? "Proxy bidding opens here soon." : "Online bidding opens here soon.")
    }
}
