import Link from "next/link"

import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { KycStatus, MyAuctionRegistration } from "@/lib/types/profile.types"

const KYC_LABELS: Record<KycStatus, string> = {
    NOT_SUBMITTED: "KYC not submitted",
    PENDING: "KYC under review",
    UNDER_REVIEW: "KYC under review",
    VERIFIED: "KYC verified",
    REJECTED: "KYC rejected",
}

// "12–14 September 2026", "28 September – 2 October 2026", or full dates across years,
// in the auction's own timezone
function formatDateRange(startIso: string, endIso: string, timeZone: string) {
    const start = new Date(startIso)
    const end = new Date(endIso)

    const parts = (date: Date) => {
        let formatter: Intl.DateTimeFormat
        try {
            formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone })
        } catch {
            // unknown timezone name — fall back to the viewer's
            formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" })
        }
        const map = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]))
        return { day: map.day, month: map.month, year: map.year }
    }

    const s = parts(start)
    const e = parts(end)

    if (s.year !== e.year) return `${s.day} ${s.month} ${s.year} – ${e.day} ${e.month} ${e.year}`
    if (s.month !== e.month) return `${s.day} ${s.month} – ${e.day} ${e.month} ${e.year}`
    if (s.day !== e.day) return `${s.day}–${e.day} ${s.month} ${s.year}`
    return `${s.day} ${s.month} ${s.year}`
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

            {/* public sale pages don't exist yet — point at them once they do */}
            <Link
                href="/"
                className="inline-flex h-10 shrink-0 items-center justify-center self-start bg-neutral-950 px-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800 sm:self-auto"
            >
                Browse
            </Link>
        </article>
    )
}
