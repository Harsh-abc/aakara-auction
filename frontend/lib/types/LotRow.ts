import type { AuctionLotForm } from "@/lib/types/AuctionsFormData";
import type { AuctionLot, LotStatus, EditionType } from "@/lib/types/auction.types";

// =====================================================================
// One row shape for the lots table — works for:
//   - lots being built in the create form (AuctionLotForm)
//   - lots already saved, fetched from the API (AuctionLot)
// =====================================================================

export interface LotRow {
    /** Stable React key (field-array id or DB uuid) */
    key: string;

    /** Position in the source array (used by edit / view / delete) */
    index: number;

    lotNumber: number;
    title: string;
    artist: string;
    artworkId: string;
    medium: string;
    year: string;
    editionType: EditionType | "";

    thumbnail: string | null;
    imageCount: number;
    videoCount: number;
    documentCount: number;

    startingPrice: number | null;
    reservePrice: number | null;
    estimateLow: number | null;
    estimateHigh: number | null;
    currency: string;

    status: LotStatus;

    /** Fields still needed before the lot can be published (form lots only) */
    missing: string[];

    source: "form" | "api";
}

const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------------
// FORM LOT -> ROW
// ---------------------------------------------------------------------

export const fromFormLot = (
    lot: AuctionLotForm | undefined,
    index: number,
    key: string,
    auctionCurrency = "INR"
): LotRow => {
    const details = lot?.details;
    const pricing = lot?.pricing;
    const media = lot?.images ?? [];

    const images = media.filter((m) => m?.file?.type?.startsWith("image/"));
    const videos = media.filter((m) => m?.file?.type?.startsWith("video/"));
    const primary = images.find((m) => m.isPrimary) ?? images[0];

    const startingPrice = num(pricing?.startingPrice);

    const missing: string[] = [];
    if (!details?.title?.trim()) missing.push("Title");
    if (startingPrice === null || startingPrice <= 0) missing.push("Starting bid");
    if (images.length === 0) missing.push("Image");

    return {
        key,
        index,
        lotNumber: index + 1,
        title: details?.title?.trim() ?? "",
        artist: details?.artist?.trim() ?? "",
        artworkId: details?.artworkId?.trim() ?? "",
        medium: details?.medium?.trim() ?? "",
        year: details?.yearCreated?.trim() ?? "",
        editionType: details?.editionType ?? "",

        thumbnail: primary?.preview ?? null,
        imageCount: images.length,
        videoCount: videos.length,
        documentCount: lot?.documents?.length ?? 0,

        startingPrice,
        reservePrice: num(pricing?.reservePrice),
        estimateLow: num(pricing?.estimateFrom),
        estimateHigh: num(pricing?.estimateTo),
        currency: pricing?.currency || auctionCurrency,

        status: lot?.status ?? "DRAFT",
        missing,
        source: "form",
    };
};

// ---------------------------------------------------------------------
// API LOT -> ROW
// ---------------------------------------------------------------------

export const fromApiLot = (lot: AuctionLot, index: number): LotRow => {
    const images = lot.images?.filter((m) => m.mediaType === "IMAGE") ?? [];
    const videos = lot.images?.filter((m) => m.mediaType === "VIDEO") ?? [];
    const primary = images.find((m) => m.isPrimary) ?? images[0];

    return {
        key: lot.uuid,
        index,
        lotNumber: Number(lot.itemNumber) || index + 1,
        title: lot.title ?? "",
        artist: lot.artistName ?? "",
        artworkId: "",
        medium: lot.medium ?? "",
        year: lot.yearCreated ?? "",
        editionType: lot.editionType ?? "",

        thumbnail: primary?.url ?? null,
        imageCount: images.length,
        videoCount: videos.length,
        documentCount: lot.documents?.length ?? 0,

        startingPrice: num(lot.startingPrice),
        reservePrice: num(lot.reservePrice),
        estimateLow: num(lot.estimateLow),
        estimateHigh: num(lot.estimateHigh),
        currency: lot.currency?.code ?? "INR",

        status: lot.status,
        missing: [],
        source: "api",
    };
};

// ---------------------------------------------------------------------
// FORMATTING
// ---------------------------------------------------------------------

export const formatMoney = (value: number | null, currency = "INR") => {
    if (value === null) return "—";
    try {
        return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(value);
    } catch {
        return `${currency} ${value.toLocaleString("en-IN")}`;
    }
};