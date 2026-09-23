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

    coverImage: File | null;
}

// ============================================================
// AUCTION SCHEDULE
// ============================================================

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

    /** Not sent yet — reserved for AuctionRule EXTENSION_TRIGGER. */
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

export interface LotImageFile {
    file: File;

    /** Object URL for preview only — never sent to backend. */
    preview: string;

    isPrimary?: boolean;
}

export interface LotDocumentFile {
    file: File;
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