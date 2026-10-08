import type { AuctionStatus } from "@/lib/types/auction.types"
import type { PublicAuction } from "@/lib/types/publicAuction.types"
import { formatDateRange } from "@/utils/formatDateRange"

export const STOREFRONT_STATUS_LABELS: Partial<Record<AuctionStatus, string>> = {
    SCHEDULED: "Upcoming",
    PREVIEW: "Preview",
    LIVE: "Live now",
    PAUSED: "Paused",
    ENDED: "Ended",
    SETTLED: "Closed",
}

export const isLive = (auction: PublicAuction) => auction.status === "LIVE" || auction.status === "PAUSED"

const isFinished = (auction: PublicAuction) => auction.status === "ENDED" || auction.status === "SETTLED"

export const badgeTone = (auction: PublicAuction) =>
    isLive(auction) ? "live" : isFinished(auction) ? "closed" : "upcoming"

// what the countdown counts to: the start for upcoming sales, the close for live ones
export function countdownFor(auction: PublicAuction): { label: string; target: string } | null {
    if (isFinished(auction)) return null
    return isLive(auction)
        ? { label: "Ends in", target: auction.endTime }
        : { label: "Live in", target: auction.startTime }
}

// "5–14 December 2026 · 40 lots · Online, Mumbai"
export function auctionMeta(auction: PublicAuction) {
    const where = [auction.isOnline ? "Online" : null, auction.venue].filter(Boolean).join(", ")
    const lots = `${auction.lotCount} ${auction.lotCount === 1 ? "lot" : "lots"}`
    return [formatDateRange(auction.startTime, auction.endTime, auction.timezone), lots, where]
        .filter(Boolean)
        .join(" · ")
}

export type RegistrationWindow =
    | { open: true }
    | { open: false; reason: string }

// mirrors the checks in registerForAuctionService so we don't offer a button that will fail
export function registrationWindow(auction: PublicAuction, now = Date.now()): RegistrationWindow {
    if (isFinished(auction)) return { open: false, reason: "Sale closed" }
    if (auction.registrationStarts && now < new Date(auction.registrationStarts).getTime()) {
        return { open: false, reason: "Registration opens soon" }
    }
    if (auction.registrationDeadline && now > new Date(auction.registrationDeadline).getTime()) {
        return { open: false, reason: "Registration closed" }
    }
    return { open: true }
}

export const auctionHref = (auction: Pick<PublicAuction, "uuid">) => `/auctions/${auction.uuid}`
