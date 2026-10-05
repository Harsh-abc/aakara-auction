import { format } from "date-fns";

import type { Auction, AuctionLot, LotStatus } from "@/lib/types/auction.types";
import type { AuctionFormData, AuctionLotForm } from "@/lib/types/AuctionsFormData";

// ============================================================
// API auction + lots  ->  AuctionFormData (edit form defaults)
// Reverse of utils/buildAuctionFormData.ts
// ============================================================

/** Decimal strings / numbers -> number | null */
const num = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
};

const text = (value: string | null | undefined): string => value ?? "";

/** ISO -> "yyyy-MM-dd" in the admin's LOCAL timezone (form convention). */
const toFormDate = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
};

/** ISO -> "HH:mm" in LOCAL time. */
const toFormTime = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : format(d, "HH:mm");
};

const toLotForm = (
    lot: AuctionLot,
    categoryUuid: string,
    sharedShippingInfo: string
): AuctionLotForm => {
    const dimension = lot.dimension;
    const shippingInfo = text(lot.shippingInfo);

    return {
        uuid: lot.uuid,
        status: lot.status as LotStatus,

        schedule: {
            startDate: toFormDate(lot.scheduledStartAt),
            startTime: toFormTime(lot.scheduledStartAt),
            endDate: toFormDate(lot.scheduledEndAt),
            endTime: toFormTime(lot.scheduledEndAt),
        },

        details: {
            title: text(lot.title),
            artist: text(lot.artistName),
            artworkId: "",
            categoryUuid,
            medium: text(lot.medium),
            yearCreated: text(lot.yearCreated),
            dimensions: {
                width: num(dimension?.width),
                height: num(dimension?.height),
                depth: num(dimension?.depth),
                unit: dimension?.dimensionUnit ?? "CM",
            },
            weight: num(dimension?.weight),
            editionType: lot.editionType ?? "UNIQUE",
            description: text(lot.description),
        },

        images: (lot.images ?? []).map((img) => ({
            url: img.url,
            mediaType: img.mediaType,
            caption: img.caption ?? null,
            preview: img.url,
            isPrimary: Boolean(img.isPrimary),
        })),

        pricing: {
            startingPrice: num(lot.startingPrice),
            reservePrice: num(lot.reservePrice),
            minimumPrice: null,
            estimateFrom: num(lot.estimateLow),
            estimateTo: num(lot.estimateHigh),
            insuranceDeclaredValue: num(lot.insureanceValue),
            currency: lot.currency?.code ?? "",
            gstRate: num(lot.gstRate),
            hsnCode: lot.hsnCode != null ? String(lot.hsnCode) : "",
        },

        condition: {
            overallCondition: text(lot.overallCondition),
            frameCondition: text(lot.frameCondition),
            detailedConditionNotes: text(lot.detailedConditionNotes),
            restorationHistory: text(lot.restorationHistory),
        },

        provenance: {
            previousOwner: text(lot.previousOwner),
            acquisitionMethod: text(lot.acquisitionMethod),
            acquisitionDate: text(lot.acquisitionDate),
            exhibitionHistory: text(lot.exhibitionHistory),
        },

        authentication: {
            authenticatedBy: text(lot.authenticateBy),
            authenticatedDate: toFormDate(lot.auctheticateDate),
        },

        documents: (lot.documents ?? []).map((doc) => ({
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            fileSize: num(doc.fileSize) ?? undefined,
            documentType: doc.documentType ?? "OTHER",
            description: text(doc.description),
        })),

        isFeatured: Boolean(lot.isFeatured),

        // Same text as the auction-level field -> inherit it, so editing
        // Shipping Info still applies to every lot
        shippingInfo: shippingInfo === sharedShippingInfo ? "" : shippingInfo,
    };
};

export const auctionToFormData = (auction: Auction, lots: AuctionLot[]): AuctionFormData => {
    const currencyCodes = auction.auctionCurrencies?.length
        ? auction.auctionCurrencies.map((c) => c.currency.code)
        : [auction.currency?.code ?? "INR"];

    const primaryCurrency =
        auction.auctionCurrencies?.find((c) => c.isPrimary)?.currency.code ??
        auction.currency?.code ??
        currencyCodes[0];

    // buildAuctionFormData copies the auction-level shipping info to every lot
    const sharedShippingInfo = text(lots.find((lot) => lot.shippingInfo)?.shippingInfo);

    const categoryUuid = auction.category?.uuid ?? "";

    // A rule exists only when extended bidding was switched on (LIVE auctions)
    const extensionMinutes = num(
        auction.rules?.find((rule) => rule.ruleType === "EXTENSION_TRIGGER")?.value
    );
    const hasExtension = auction.auctionType === "LIVE" && extensionMinutes !== null;

    return {
        basicInfo: {
            auctionName: auction.title,
            // Sent back as the slug — backend keeps the slug when it's unchanged
            auctionId: auction.slug,
            auctionType: auction.auctionType,
            description: text(auction.description),
            shortDescription: text(auction.short_description),
            categoryUuid,
            subCategoryUuid: auction.subCategory?.uuid ?? "",
            auctionLocation: text(auction.venue),
            auctionTags: (auction.tags ?? []).map((t) => t.tag.name),
            currency: currencyCodes,
            primaryCurrency,
            coverImage: null,
            coverImageUrl: text(auction.coverImageUrl),
        },

        schedule: {
            startDate: toFormDate(auction.startTime),
            startTime: toFormTime(auction.startTime),
            endDate: toFormDate(auction.endTime),
            endTime: toFormTime(auction.endTime),
            previewStartAt: toFormDate(auction.previewStartAt),
            registrationRequired: auction.registrationRequired ?? true,
            registrationStarts: toFormDate(auction.registrationStarts),
            registrationDeadline: toFormDate(auction.registrationDeadline),
            timezone: auction.timezone || "Asia/Kolkata",
            allowExtendedBidding: hasExtension,
            auctionExtensionTime: hasExtension ? extensionMinutes : null,
        },

        lots: lots.map((lot) => toLotForm(lot, categoryUuid, sharedShippingInfo)),

        fees: (auction.auctionFees ?? []).map((fee, index) => ({
            feeType: fee.feeType,
            name: fee.name,
            calculationType: fee.calculationType,
            value: num(fee.value),
            description: text(fee.description),
            isActive: fee.isActive ?? true,
            sortOrder: num(fee.sortOrder) ?? index,
        })),

        shipping: {
            shippingStrategy: auction.shippingStrategy ?? "SHIPPING_CALCULATED_SEPARATELY",
            isOnline: auction.isOnline ?? true,
            venue: text(auction.venue),
            shippingInfo: sharedShippingInfo,
        },

        visibility: {
            visibility: auction.visibility ?? "REGISTERED_USERS_ONLY",
            termsAndConditions: text(auction.termsAndConditions),
        },
    };
};
