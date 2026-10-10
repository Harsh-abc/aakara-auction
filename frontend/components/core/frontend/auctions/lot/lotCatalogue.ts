import type { PublicLotDetail } from "@/lib/types/publicAuction.types"

import { lotDimensions } from "../detail/lotDisplay"
import { isClosedLot, isUpcomingLot } from "./lotPageDisplay"

const EDITION_LABELS: Record<PublicLotDetail["editionType"], string> = {
    UNIQUE: "Unique work",
    LIMITED: "Limited edition",
    OPEN: "Open edition",
}

const ACQUISITION_LABELS: Record<string, string> = {
    PURCHASE: "purchase",
    INHERITANCE: "inheritance",
    GIFT: "gift",
    AUCTION: "auction",
    COMMISSION: "commission",
}

// "12 March 2001"; acquisition dates are stored as "YYYY-MM-DD"
function formatDay(value: string | null) {
    if (!value) return null
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date)
}

// free-text fields are entered one item per line
const lines = (value: string | null) => (value ? value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [])

const compact = (values: (string | null | undefined | false)[]) => values.filter((v): v is string => !!v)

export type CatalogueSection = {
    title: string
    /** paragraphs of lines; each paragraph is a block, each line its own row */
    paragraphs: string[][]
    defaultOpen: boolean
}

// the "Lot details" accordion — only sections with something to say
export function catalogueSections(lot: PublicLotDetail): CatalogueSection[] {
    const acquisition = lot.acquisitionMethod
        ? compact([
              lot.acquisitionMethod === "OTHER" ? "Acquired" : `Acquired by ${ACQUISITION_LABELS[lot.acquisitionMethod] ?? lot.acquisitionMethod.toLowerCase()}`,
              lot.acquisitionDate && `on ${formatDay(lot.acquisitionDate)}`,
          ]).join(" ")
        : lot.acquisitionDate && `Acquired on ${formatDay(lot.acquisitionDate)}`
    const authentication =
        lot.authenticateBy && compact([`Authenticated by ${lot.authenticateBy}`, formatDay(lot.authenticatedAt)]).join(", ")

    const sections: CatalogueSection[] = [
        {
            title: "Description",
            defaultOpen: true,
            paragraphs: [
                compact([lot.artistName, compact([lot.title, lot.yearCreated]).join(", ")]),
                compact([lot.medium, lotDimensions(lot), EDITION_LABELS[lot.editionType]]),
            ],
        },
        {
            title: "Condition report",
            defaultOpen: false,
            paragraphs: [
                compact([
                    lot.overallCondition && `Overall condition: ${lot.overallCondition}`,
                    lot.frameCondition && lot.frameCondition !== "Not Applicable" && `Frame: ${lot.frameCondition}`,
                ]),
                lines(lot.conditionReport),
                lines(lot.detailedConditionNotes),
                lines(lot.restorationHistory).map((line, index) => (index === 0 ? `Restoration: ${line}` : line)),
            ],
        },
        {
            title: "Provenance",
            defaultOpen: true,
            paragraphs: [lines(lot.provenance), compact([lot.previousOwner, acquisition, authentication])],
        },
        { title: "Exhibited", defaultOpen: true, paragraphs: [lines(lot.exhibitionHistory)] },
    ]

    return sections
        .map((section) => ({ ...section, paragraphs: section.paragraphs.filter((p) => p.length > 0) }))
        .filter((section) => section.paragraphs.length > 0)
}

// the lot's own bidding window: counts to its opening, then to its close
export function lotCountdown(lot: PublicLotDetail) {
    if (isClosedLot(lot)) return null
    if (isUpcomingLot(lot)) return { label: "Opens in", target: lot.scheduledStartAt }
    return { label: "Closes in", target: lot.scheduledEndAt }
}
