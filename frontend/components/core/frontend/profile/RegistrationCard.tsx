import Link from "next/link"

import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { KycStatus, MyAuctionRegistration } from "@/lib/types/profile.types"
import { cn } from "@/lib/utils"
import { formatDateRange } from "@/utils/formatDateRange"
import { auctionHref } from "../auctions/auctionDisplay"
import { BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, EYEBROW } from "../storefront"

const KYC_LABELS: Record<KycStatus, string> = {
    NOT_SUBMITTED: "KYC not submitted",
    PENDING: "KYC under review",
    UNDER_REVIEW: "KYC under review",
    VERIFIED: "KYC verified",
    REJECTED: "KYC rejected",
}

type RegistrationCardProps = {
    registration: MyAuctionRegistration
    bidderName: string
    kycStatus: KycStatus
}

export function RegistrationCard({ registration, bidderName, kycStatus }: RegistrationCardProps) {
    const { auction, paddleNumber, status } = registration
    const registrationLabel = status === "APPROVED" ? "Registered bidder" : "Registration pending"

    return (
        <article className="flex flex-col gap-5 border border-[#cecece] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className={EYEBROW}>
                    {registrationLabel} · {AUCTION_STATUS_LABELS[auction.status]}
                </p>
                <h3 className="mt-2 truncate text-[14px] leading-5 font-medium text-[#0d0d0d]">{auction.title}</h3>
                <p className="mt-1 text-[14px] leading-5 text-[#0d0d0d]">
                    {bidderName} · Paddle {paddleNumber}
                </p>
                <p className={cn(EYEBROW, "mt-1.5")}>
                    {KYC_LABELS[kycStatus]} · {formatDateRange(auction.startTime, auction.endTime, auction.timezone)}
                </p>
            </div>

            <Link href={auctionHref(auction)} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE, "shrink-0 self-start sm:self-auto")}>
                Browse
            </Link>
        </article>
    )
}
