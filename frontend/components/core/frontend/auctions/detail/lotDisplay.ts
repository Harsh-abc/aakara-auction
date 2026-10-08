import type { LotStatus, PublicLot } from "@/lib/types/publicAuction.types"

// "₹4,50,000" for INR (lakh grouping), "$45,000" etc. for the rest
export function formatMoney(amount: string | number | null, currency: PublicLot["currency"]) {
    if (amount === null || amount === "") return null
    const value = Number(amount)
    if (!Number.isFinite(value)) return null
    try {
        return new Intl.NumberFormat(currency.code === "INR" ? "en-IN" : "en-US", {
            style: "currency",
            currency: currency.code,
            maximumFractionDigits: 0,
        }).format(value)
    } catch {
        // unknown currency code
        return `${currency.symbol ?? currency.code} ${value.toLocaleString("en-IN")}`
    }
}

export const lotNumber = (lot: PublicLot) => `Lot ${lot.itemNumber.padStart(2, "0")}`

// "Artist name · Work title"
export const lotHeading = (lot: PublicLot) => [lot.artistName, lot.title].filter(Boolean).join(" · ")

const trimDecimal = (value: string) => String(Number(value))

// "Oil on canvas · 1978 · 122 × 91 × 3 cm" — height first, the catalogue convention
export function lotDetails(lot: PublicLot) {
    const d = lot.dimension
    const sizes = d ? [d.height, d.width, d.depth].filter((v): v is string => !!v && Number(v) > 0).map(trimDecimal) : []
    const dimensions = sizes.length ? `${sizes.join(" × ")} ${d!.dimensionUnit.toLowerCase()}` : null
    return [lot.medium, lot.yearCreated, dimensions].filter(Boolean).join(" · ")
}

export function lotEstimate(lot: PublicLot) {
    const low = formatMoney(lot.estimateLow, lot.currency)
    const high = formatMoney(lot.estimateHigh, lot.currency)
    if (low && high) return `${low} – ${high}`
    return low ?? high
}

const bids = (count: number) => `${count} ${count === 1 ? "bid" : "bids"}`

// the bid line under the estimate
export function lotBidLine(lot: PublicLot) {
    const count = Number(lot.bidCount) || 0
    const current = formatMoney(lot.currentBid, lot.currency)

    if (lot.status === "SOLD" && current) return `Sold for ${current}`
    if (lot.status === "WITHDRAWN") return "Withdrawn from sale"
    if ((lot.status === "UNSOLD" || lot.status === "PASSED") && count === 0) return "Unsold"
    if (count > 0 && current) return `Current bid ${current} · ${bids(count)}`
    return `Starting bid ${formatMoney(lot.startingPrice, lot.currency) ?? "—"} · ${bids(0)}`
}

export const LOT_BADGES: Partial<Record<LotStatus, { label: string; live?: boolean }>> = {
    ACTIVE: { label: "Live", live: true },
    SOLD: { label: "Sold" },
    UNSOLD: { label: "Unsold" },
    PASSED: { label: "Passed" },
    WITHDRAWN: { label: "Withdrawn" },
}

// lot pages don't exist yet — this is where "View" will point once they do
export const lotHref = (auctionUuid: string, lot: PublicLot) => `/auctions/${auctionUuid}/lots/${lot.uuid}`
