
import type {
    AuctionType,
    AuctionStatus,
    ShippingStrategy,
    AuctionVisibility,
    FeeType,
    FeeCalculationType,
    LotStatus,
    DocumentType,
} from '../types/auction.types'


// ============================================================
// BASIC INFO
// ============================================================

export interface BasicInfoForm {
    auctionName: string;

    /**
     * UI/business field.
     * The current create-auction API does not store this separately.
     */
    auctionId: string;

    auctionType: AuctionType;

    description: string;
    shortDescription: string;

    categoryUuid: string;
    subCategoryUuid: string;

    auctionLocation: string;

    auctionTags: string[];

    currency: string[];

    coverImage: File | null;
}


// ============================================================
// AUCTION SCHEDULE
// ============================================================

export interface AuctionScheduleForm {
    startDate: string;
    startTime: string;

    endDate: string;
    endTime: string;

    previewStartAt: string;

    registrationRequired: boolean;

    registrationStarts: string;
    registrationDeadline: string;

    timezone: string;

    /**
     * Currently not part of the create-auction API payload.
     * Can be used later for AuctionExtension.
     */
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

    /**
     * Used only for frontend preview.
     * Not sent to backend.
     */
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

    /**
     * UI/business field.
     * Current AuctionItem API does not have an artworkId field.
     */
    artworkId: string;

    /**
     * Currently the create-auction backend uses the auction's
     * categoryUuid for the lot.
     */
    categoryUuid: string;

    medium: string;

    yearCreated: string;

    dimensions: {
        width: number | null;
        height: number | null;
        depth: number | null;
        unit: string;
    };

    /**
     * Current backend AuctionItem schema does not have weight.
     */
    weight: number | null;

    editionType: "UNIQUE" | "LIMITED" | "OPEN";

    description: string;
}


// ============================================================
// LOT PRICING
// ============================================================

export interface LotPricingForm {
    startingPrice: number | null;

    reservePrice: number | null;

    /**
     * Current create-auction backend does not use minimumPrice.
     */
    minimumPrice: number | null;

    estimateFrom: number | null;

    estimateTo: number | null;

    insuranceDeclaredValue: number | null;

    currency: string;

    gstRate: number | null;

    /**
     * Keep as string in the form because HSN is normally an
     * identifier/code rather than a calculated number.
     *
     * The current backend schema expects Decimal, so the
     * transformer will convert this when creating the API payload.
     */
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

    acquisitionDate: string;

    exhibitionHistory: string;
}


// ============================================================
// LOT AUTHENTICATION
// ============================================================

export interface LotAuthenticationForm {
    authenticatedBy: string;

    authenticatedDate: string;
}


// ============================================================
// COMPLETE LOT FORM
// ============================================================

export interface AuctionLotForm {
    status: LotStatus;

    details: LotDetailsForm;

    /**
     * Files selected from the frontend.
     * These are uploaded separately as multipart/form-data.
     */
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
