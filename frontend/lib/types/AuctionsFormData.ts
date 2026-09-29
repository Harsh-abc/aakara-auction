import type {
    AuctionType,
    ShippingStrategy,
    AuctionVisibility,
    FeeType,
    FeeCalculationType,
    LotStatus,
    DocumentType,
    DimensionUnit,
    EditionType,
    MediaType,
} from "./auction.types";

// ============================================================
// BASIC INFO
// ============================================================

export interface BasicInfoForm {
    auctionName: string;

    /** Optional reference. Used as the slug if provided (backend makes it unique). */
    auctionId: string;

    auctionType: AuctionType;

    description: string;
    shortDescription: string;

    categoryUuid: string;
    subCategoryUuid: string;

    /** Used as the venue if shipping.venue is empty. */
    auctionLocation: string;

    auctionTags: string[];

    /** Auction stores ONE currency — the first selected one is sent. */
    currency: string[];
    primaryCurrency: string;

    /** New cover picked in this session. */
    coverImage: File | null;

    /** Edit only: the saved cover. "" = none / removed (sends removeCoverImage). */
    coverImageUrl: string;
}

// ============================================================
// AUCTION SCHEDULE
// ============================================================

/** Mirrors DEFAULT_EXTENSION_MINUTES in the backend auction service. */
export const DEFAULT_EXTENSION_MINUTES = 2;

export interface AuctionScheduleForm {
    startDate: string; // "yyyy-MM-dd"
    startTime: string; // "HH:mm" (12h "hh:mm AM" also accepted)

    endDate: string;
    endTime: string;

    previewStartAt: string;

    registrationRequired: boolean;

    registrationStarts: string;
    registrationDeadline: string;

    timezone: string;

    /**
     * On  -> auctionExtensionTime is used.
     * Off -> backend applies DEFAULT_EXTENSION_MINUTES.
     * Saved as an AuctionRule (EXTENSION_TRIGGER) either way.
     */
    allowExtendedBidding: boolean;

    /** Custom extension duration in minutes (1 - 60). */
    auctionExtensionTime: number | null;
}

// ============================================================
// AUCTION FEES
// ============================================================

export interface AuctionFeeForm {
    feeType: FeeType;
    name: string;
    calculationType: FeeCalculationType;
    value: number | null;
    description: string;
    isActive: boolean;
    sortOrder: number;
}

// ============================================================
// AUCTION SHIPPING
// ============================================================

export interface AuctionShippingForm {
    shippingStrategy: ShippingStrategy;
    isOnline: boolean;
    venue: string;

    /** Copied to every lot that has no shippingInfo of its own. */
    shippingInfo: string;
}

// ============================================================
// AUCTION VISIBILITY
// ============================================================

export interface AuctionVisibilityForm {
    visibility: AuctionVisibility;
    termsAndConditions: string;
}

// ============================================================
// LOT MEDIA
// ============================================================

/**
 * Either a NEW upload (`file` set) or media already SAVED on the lot
 * (`url` set, edit only — sent back as keepMedia).
 */
export interface LotImageFile {
    file?: File;

    /** Saved media URL (edit only). */
    url?: string;
    mediaType?: MediaType;
    caption?: string | null;

    /** Object URL for new files, or the saved URL — never sent to backend. */
    preview: string;

    isPrimary?: boolean;
}

/**
 * Either a NEW upload (`file` set) or a document already SAVED on the lot
 * (`fileUrl` set, edit only — sent back as keepDocuments).
 */
export interface LotDocumentFile {
    file?: File;

    /** Saved document (edit only). */
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;

    documentType: DocumentType;
    description: string;
}

// ============================================================
// LOT DETAILS
// ============================================================

export interface LotDetailsForm {
    title: string;
    artist: string;

    /** UI-only. AuctionItem has no artworkId column. */
    artworkId: string;

    /** UI-only for now. Backend uses the auction's category for every lot. */
    categoryUuid: string;

    medium: string;
    yearCreated: string;

    dimensions: {
        width: number | null;
        height: number | null;
        depth: number | null;
        unit: DimensionUnit;
    };

    /** Saved to AuctionItemDimension.weight (unit KG). */
    weight: number | null;

    editionType: EditionType;

    description: string;
}

// ============================================================
// LOT PRICING
// ============================================================

export interface LotPricingForm {
    startingPrice: number | null;
    reservePrice: number | null;

    /** UI-only. No column in AuctionItem. */
    minimumPrice: number | null;

    estimateFrom: number | null;
    estimateTo: number | null;

    insuranceDeclaredValue: number | null;

    /** UI-only. Lots use the auction's currency. */
    currency: string;

    gstRate: number | null;

    /** Kept as a string; backend strips spaces/dots before saving. */
    hsnCode: string;
}

// ============================================================
// LOT CONDITION
// ============================================================

export interface LotConditionForm {
    overallCondition: string;
    frameCondition: string;
    detailedConditionNotes: string;
    restorationHistory: string;
}

// ============================================================
// LOT PROVENANCE
// ============================================================

export interface LotProvenanceForm {
    previousOwner: string;
    acquisitionMethod: string;
    acquisitionDate: string; // "yyyy-MM-dd"
    exhibitionHistory: string;
}

// ============================================================
// LOT AUTHENTICATION
// ============================================================

export interface LotAuthenticationForm {
    authenticatedBy: string;
    authenticatedDate: string; // "yyyy-MM-dd"
}

// ============================================================
// COMPLETE LOT FORM
// ============================================================

export interface AuctionLotForm {
    /** Edit only: saved lot uuid. Missing = new lot. */
    uuid?: string;

    status: LotStatus;
    details: LotDetailsForm;
    images: LotImageFile[];
    pricing: LotPricingForm;
    condition: LotConditionForm;
    provenance: LotProvenanceForm;
    authentication: LotAuthenticationForm;
    documents: LotDocumentFile[];
    isFeatured: boolean;
    shippingInfo: string;
}

// ============================================================
// COMPLETE AUCTION FORM
// ============================================================

export interface AuctionFormData {
    basicInfo: BasicInfoForm;
    schedule: AuctionScheduleForm;
    lots: AuctionLotForm[];
    fees: AuctionFeeForm[];
    shipping: AuctionShippingForm;
    visibility: AuctionVisibilityForm;
}