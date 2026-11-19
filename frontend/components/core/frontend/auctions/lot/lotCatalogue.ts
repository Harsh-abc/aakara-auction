import type { PublicLotDetail } from "@/lib/types/publicAuction.types";

import { lotDimensions } from "../detail/lotDisplay";
import { isClosedLot, isUpcomingLot } from "./lotPageDisplay";

const ACQUISITION_LABELS: Record<string, string> = {
    PURCHASE: "purchase",
    INHERITANCE: "inheritance",
    GIFT: "gift",
    AUCTION: "auction",
    COMMISSION: "commission",
};

// "12 March 2001"; acquisition dates are stored as "YYYY-MM-DD"
function formatDay(value: string | null) {
    if (!value) return null;
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

// free-text fields are entered one item per line
const lines = (value: string | null) =>
    value
        ? value
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
        : [];

// free text in blocks: a blank line starts a new block, each other line is its own row
const blocks = (value: string | null) => (value ? value.split(/\r?\n\s*\r?\n/).map(lines) : []);

const compact = (values: (string | null | undefined | false)[]) => values.filter((v): v is string => !!v);

/** a row of text; `small` rows (e.g. the artist's life dates) are set in smaller type */
export type CatalogueLine = string | { text: string; small: true };

export type CatalogueSection = {
    title: string;
    /** paragraphs of lines; each paragraph is a block, each line its own row */
    paragraphs: CatalogueLine[][];
    defaultOpen: boolean;
};

// the "Lot details" accordion — only sections with something to say
export function catalogueSections(lot: PublicLotDetail): CatalogueSection[] {
    const acquisition = lot.acquisitionMethod
        ? compact([
              lot.acquisitionMethod === "OTHER" ? "Acquired" : `Acquired by ${ACQUISITION_LABELS[lot.acquisitionMethod] ?? lot.acquisitionMethod.toLowerCase()}`,
              lot.acquisitionDate && `on ${formatDay(lot.acquisitionDate)}`,
          ]).join(" ")
        : lot.acquisitionDate && `Acquired on ${formatDay(lot.acquisitionDate)}`;
    const authentication = lot.authenticateBy && compact([`Authenticated by ${lot.authenticateBy}`, formatDay(lot.authenticatedAt)]).join(", ");


    const sections: CatalogueSection[] = [
        {
            title: "Description",
            defaultOpen: true,
            // artist, title, then the year on its own line (when the lot has one)
            // artist, title, medium and year on their own lines, then the size
            paragraphs: [compact([lot.artistName, lot.title, lot.medium, lot.yearCreated]), compact([lotDimensions(lot)]), ...blocks(lot.catalogueNote)],
        },
        {
            title: "Provenance",
            defaultOpen: true,
            // the previous owner is kept private — it isn't sent to the storefront
            paragraphs: [lines(lot.provenance), compact([acquisition, authentication])],
        },
        { title: "Exhibited", defaultOpen: true, paragraphs: [lines(lot.exhibitionHistory)] },
        { title: "Literature", defaultOpen: true, paragraphs: [lines(lot.publicationHistory)] },
    ];

    return sections.map((section) => ({ ...section, paragraphs: section.paragraphs.filter((p) => p.length > 0) })).filter((section) => section.paragraphs.length > 0);
}

// the lot's own bidding window: counts to its opening, then to its close
export function lotCountdown(lot: PublicLotDetail) {
    if (isClosedLot(lot)) return null;
    if (isUpcomingLot(lot)) return { label: "Opens in", target: lot.scheduledStartAt };
    return { label: "Closes in", target: lot.scheduledEndAt };
}
