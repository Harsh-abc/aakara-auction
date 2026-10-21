import type { ArtworkDimensions, ArtworkRow, ArtworkStage } from "@/lib/types/artwork.types"
import type { LotStatus } from "@/lib/types/publicAuction.types"

import { money, type PillTone } from "../home/dashboardUi"

export const ARTWORK_STATUS: Record<LotStatus, { label: string; tone: PillTone }> = {
    DRAFT: { label: "Draft", tone: "slate" },
    SCHEDULED: { label: "Upcoming", tone: "amber" },
    ACTIVE: { label: "On the block", tone: "green" },
    SOLD: { label: "Sold", tone: "maroon" },
    UNSOLD: { label: "Unsold", tone: "red" },
    PASSED: { label: "Passed", tone: "slate" },
    WITHDRAWN: { label: "Withdrawn", tone: "slate" },
}

export const STAGE_LABELS: Record<ArtworkStage, string> = {
    all: "All",
    upcoming: "Upcoming",
    live: "On the block",
    sold: "Sold",
    unsold: "Unsold",
    withdrawn: "Withdrawn",
}

export const EDITION_LABELS: Record<ArtworkRow["edition"], string> = {
    UNIQUE: "Unique work",
    LIMITED: "Limited edition",
    OPEN: "Open edition",
}

export const VISIBILITY_LABELS: Record<ArtworkRow["auction"]["visibility"], string> = {
    PUBLIC: "Public",
    REGISTERED_USERS_ONLY: "Registered users",
    PRIVATE_INVITE_ONLY: "Invite only",
}

const UNIT_LABELS: Record<ArtworkDimensions["unit"], string> = { CM: "cm", INCH: "in", MM: "mm", METER: "m", FEET: "ft" }

/** "120.00" → "120", "45.50" → "45.5" */
const trimNumber = (value: string) => String(Number(value))

/** "120 × 90 × 4 cm" (height × width × depth, the catalogue convention) */
export const formatDimensions = (dimensions: ArtworkDimensions | null) => {
    if (!dimensions) return null
    const parts = [dimensions.height, dimensions.width, dimensions.depth].filter((v): v is string => !!v && Number(v) > 0)
    return parts.length ? `${parts.map(trimNumber).join(" × ")} ${UNIT_LABELS[dimensions.unit] ?? dimensions.unit.toLowerCase()}` : null
}

export const formatEstimate = (row: Pick<ArtworkRow, "estimateLow" | "estimateHigh" | "currency">) => {
    const { estimateLow: low, estimateHigh: high } = row
    if (low && high) return `${money(low, row.currency.code)} – ${money(high, row.currency.code)}`
    if (low || high) return money((low ?? high) as string, row.currency.code)
    return null
}

/** The price line on a card: what the artwork sold for, is at, or starts at */
export const priceLine = (row: ArtworkRow): { label: string; value: string | null; note?: string } => {
    const code = row.currency.code
    const bids = Number(row.bidCount)
    const bidsNote = bids > 0 ? `${bids.toLocaleString("en-IN")} bid${bids === 1 ? "" : "s"}` : undefined

    switch (row.status) {
        case "SOLD":
            return { label: "Hammer price", value: money(row.hammerPrice ?? row.currentBid, code), note: bidsNote }
        case "ACTIVE":
            return bids > 0
                ? { label: "Current bid", value: money(row.currentBid, code), note: bidsNote }
                : { label: "Opening bid", value: money(row.startingPrice, code), note: "No bids yet" }
        case "PASSED":
            return { label: "Top bid (reserve not met)", value: money(row.currentBid, code), note: bidsNote }
        case "UNSOLD":
            return { label: "Starting bid", value: money(row.startingPrice, code), note: "No bids" }
        case "WITHDRAWN":
            return { label: "Withdrawn", value: null }
        default:
            return { label: "Starting bid", value: money(row.startingPrice, code) }
    }
}

// what the public storefront lists (see backend publicAuction.services.js)
const STOREFRONT_AUCTION_STATUSES = ["SCHEDULED", "PREVIEW", "LIVE", "PAUSED", "ENDED", "SETTLED"]

/** The artwork's public lot page, when the storefront shows it */
export const storefrontHref = (lotUuid: string, auction: Pick<ArtworkRow["auction"], "uuid" | "status" | "visibility">) =>
    auction.visibility !== "PRIVATE_INVITE_ONLY" && STOREFRONT_AUCTION_STATUSES.includes(auction.status)
        ? `/auctions/${auction.uuid}/lots/${lotUuid}`
        : null
