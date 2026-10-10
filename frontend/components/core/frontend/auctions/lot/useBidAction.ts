"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAppSelector } from "@/hooks/redux"
import type { PublicLot } from "@/lib/types/publicAuction.types"

export type BidKind = "bid" | "proxy"

export type BidTarget = { kind: BidKind; lotUuid: string }

// guests sign in first and come back to this lot; signed-in users get the bid dialog (see BidDialog)
export function useBidAction() {
    const router = useRouter()
    const pathname = usePathname()
    const token = useAppSelector((state) => state.auth.accessToken)
    const [target, setTarget] = useState<BidTarget | null>(null)

    const onBid = (kind: BidKind, lot: Pick<PublicLot, "uuid">) => {
        if (!token) {
            router.push(`/registration?redirect=${encodeURIComponent(pathname)}`)
            return
        }
        setTarget({ kind, lotUuid: lot.uuid })
    }

    return { onBid, target, setTarget }
}
