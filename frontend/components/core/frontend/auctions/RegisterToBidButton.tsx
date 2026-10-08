"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { cn } from "@/lib/utils"
import type { PublicAuction } from "@/lib/types/publicAuction.types"
import { registerForAuction } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "../profile/ProfileUI"

import { registrationWindow } from "./auctionDisplay"

const LOGIN_HREF = `/registration?redirect=${encodeURIComponent("/auctions")}`

type RegisterToBidButtonProps = {
    auction: PublicAuction
    /** set when the signed-in bidder already holds a paddle for this sale */
    paddleNumber?: string
    onRegistered: (auctionUuid: string, paddleNumber: string) => void
    className?: string
}

export function RegisterToBidButton({ auction, paddleNumber, onRegistered, className }: RegisterToBidButtonProps) {
    const router = useRouter()
    const token = useAppSelector((state) => state.auth.accessToken)
    const [loading, setLoading] = useState(false)

    const base =
        "inline-flex h-11 w-full items-center justify-center px-6 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors"

    if (paddleNumber) {
        return (
            <span className={cn(base, "border border-neutral-950 bg-white text-neutral-950", className)}>
                Registered · Paddle {paddleNumber}
            </span>
        )
    }

    const registration = registrationWindow(auction)
    if (!registration.open) {
        return (
            <span className={cn(base, "cursor-not-allowed bg-neutral-200 text-neutral-500", className)}>
                {registration.reason}
            </span>
        )
    }

    const handleClick = async () => {
        if (!token) {
            router.push(LOGIN_HREF)
            return
        }
        setLoading(true)
        try {
            const { message, data } = await registerForAuction(auction.uuid, token)
            toast.success(message)
            onRegistered(auction.uuid, String(data.paddleNumber))
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className={cn(
                base,
                "cursor-pointer bg-neutral-950 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70",
                className
            )}
        >
            {loading ? "Registering..." : "Register to bid"}
        </button>
    )
}
