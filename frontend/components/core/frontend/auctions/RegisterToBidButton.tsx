"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { cn } from "@/lib/utils"
import type { PublicAuction } from "@/lib/types/publicAuction.types"
import { registerForAuction } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "@/lib/apiError"

import { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID } from "../storefront"
import { registrationWindow, type BidderEligibility } from "./auctionDisplay"
import { RegisterConfirmDialog } from "./RegisterConfirmDialog"

const LOGIN_HREF = `/registration?redirect=${encodeURIComponent("/")}`
const KYC_HREF = "/my-profile"

type RegisterToBidButtonProps = {
    auction: PublicAuction
    /** set when the signed-in bidder already holds a paddle for this sale */
    paddleNumber?: string
    /** only BIDDER accounts with verified KYC can register */
    eligibility: BidderEligibility
    onRegistered: (auctionUuid: string, paddleNumber: string) => void
    className?: string
}

export function RegisterToBidButton({ auction, paddleNumber, eligibility, onRegistered, className }: RegisterToBidButtonProps) {
    const router = useRouter()
    const token = useAppSelector((state) => state.auth.accessToken)
    const [loading, setLoading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    // shared 44px storefront button
    const base = BUTTON

    if (paddleNumber) {
        return (
            <span className={cn(base, BUTTON_OUTLINE, className)}>
                Registered · Paddle {paddleNumber}
            </span>
        )
    }

    const registration = registrationWindow(auction)
    if (!registration.open || eligibility === "not-bidder" || eligibility === "awaiting-bidder-role") {
        return (
            <span className={cn(base, "cursor-not-allowed border-[#cecece] bg-[#f4f2ef] text-[#717171]", className)}>
                {!registration.open
                    ? registration.reason
                    : eligibility === "awaiting-bidder-role"
                        ? "Awaiting bidder approval"
                        : "Bidder accounts only"}
            </span>
        )
    }

    if (eligibility === "kyc-pending") {
        return (
            <Link href={KYC_HREF} className={cn(base, BUTTON_SOLID, className)}>
                Register to Bid
            </Link>
        )
    }

    const handleClick = () => {
        if (!token) {
            router.push(LOGIN_HREF)
            return
        }
        setConfirmOpen(true)
    }

    // runs once the bidder has reviewed their details and ticked the terms
    const handleConfirm = async () => {
        setLoading(true)
        try {
            const { message, data } = await registerForAuction(auction.uuid, token)
            toast.success(message)
            setConfirmOpen(false)
            onRegistered(auction.uuid, String(data.paddleNumber))
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                disabled={loading || eligibility === "loading"}
                className={cn(
                    base,
                    BUTTON_SOLID,
                    className
                )}
            >
                {loading ? "Registering..." : "Register to bid"}
            </button>

            <RegisterConfirmDialog
                auction={auction}
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                submitting={loading}
                onConfirm={handleConfirm}
            />
        </>
    )
}
