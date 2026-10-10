import type { LotStatus, PublicLot } from "@/lib/types/publicAuction.types"

import { formatMoney } from "../detail/lotDisplay"

export const CLOSED_LOT_STATUSES: LotStatus[] = ["SOLD", "UNSOLD", "PASSED", "WITHDRAWN"]
export const UPCOMING_LOT_STATUSES: LotStatus[] = ["DRAFT", "SCHEDULED"]

export const isClosedLot = (lot: PublicLot) => CLOSED_LOT_STATUSES.includes(lot.status)
export const isUpcomingLot = (lot: PublicLot) => UPCOMING_LOT_STATUSES.includes(lot.status)

const pad = (value: string) => value.padStart(2, "0")

// "06" in lists, "Lot 06" on tags
export const lotNo = (lot: PublicLot) => pad(lot.itemNumber)
export const lotTag = (lot: PublicLot) => `Lot ${lotNo(lot)}`

const CLOSED_LABELS: Partial<Record<LotStatus, string>> = {
    UNSOLD: "Unsold",
    PASSED: "Passed",
    WITHDRAWN: "Withdrawn",
}

export const closedLabel = (lot: PublicLot) => CLOSED_LABELS[lot.status] ?? null

// "Lots 01–40"
export function lotRange(lots: PublicLot[]) {
    if (lots.length === 0) return null
    if (lots.length === 1) return `Lot ${lotNo(lots[0])}`
    return `Lots ${lotNo(lots[0])}–${lotNo(lots[lots.length - 1])}`
}

// the next lot to come up after the one on the block
export function upNextLot(lots: PublicLot[]) {
    const liveIndex = lots.findIndex((lot) => lot.status === "ACTIVE")
    if (liveIndex === -1) return null
    return lots.slice(liveIndex + 1).find(isUpcomingLot) ?? null
}

// what the auctioneer is calling for the lot on the block
export function auctioneerCall(lot: PublicLot) {
    const current = Number(lot.bidCount) > 0 ? formatMoney(lot.currentBid, lot.currency) : null
    if (current) return `“${current} is the bid. Any advance on ${current}?”`
    return `“Who will start me at ${formatMoney(lot.startingPrice, lot.currency) ?? "—"}?”`
}

export const bidCountLabel = (count: number) => `${count} ${count === 1 ? "bid" : "bids"}`
