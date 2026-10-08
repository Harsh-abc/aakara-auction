import Link from "next/link"

import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { KycStatus, MyAuctionRegistration } from "@/lib/types/profile.types"
import { formatDateRange } from "@/utils/formatDateRange"
import { auctionHref } from "../auctions/auctionDisplay"

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
        <article className="flex flex-col gap-5 border border-neutral-500 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    {registrationLabel} · {AUCTION_STATUS_LABELS[auction.status]}
                </p>
                <h3 className="mt-2 truncate text-sm text-neutral-950">{auction.title}</h3>
                <p className="mt-1 text-sm text-neutral-900">
                    {bidderName} · Paddle {paddleNumber}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    {KYC_LABELS[kycStatus]} · {formatDateRange(auction.startTime, auction.endTime, auction.timezone)}
                </p>
            </div>

            <Link
                href={auctionHref(auction)}
                className="inline-flex h-10 shrink-0 items-center justify-center self-start bg-neutral-950 px-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800 sm:self-auto"
            >
                Browse
            </Link>
        </article>
    )
}
