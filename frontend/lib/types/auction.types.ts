
export type AuctionType =
    | "LIVE"
    | "FLOOR"
    | "HYBRID";

export type AuctionStatus =
    | "DRAFT"
    | "SCHEDULED"
    | "PREVIEW"
    | "LIVE"
    | "PAUSED"
    | "ENDED"
    | "SETTLED"
    | "CANCELLED";

export type ShippingStrategy =
    | "SHIPPING_INCLUDED"
    | "SHIPPING_CALCULATED_SEPARATELY"
    | "BUYER_ARRANGES_PICKUP"
    | "ADMIN_ARRANGES_DELIVERY";

export type AuctionVisibility =
    | "PUBLIC"
    | "REGISTERED_USERS_ONLY"
    | "PRIVATE_INVITE_ONLY";

export type FeeType =
    | "BUYER_PREMIUM"
    | "PLATFORM_FEE"
    | "TAX_GST"
    | "PAYMENT_PROCESSING"
    | "LATE_PAYMENT"
    | "SHIPPING"
    | "CUSTOM";

export type FeeCalculationType =
    | "PERCENTAGE"
    | "FIXED";

export type LotStatus =
    | "DRAFT"
    | "SCHEDULED"
    | "ACTIVE"
    | "SOLD"
    | "UNSOLD"
    | "PASSED"
    | "WITHDRAWN";

export type DocumentType =
    | "CERTIFICATE_OF_AUTHENTICITY"
    | "PROVENANCE"
    | "APPRAISAL"
    | "INSURANCE"
    | "OTHER";

export type MediaType =
    | "IMAGE"
    | "VIDEO";

export type AuctionTag = string;


export interface AuctionFee {
    feeType: FeeType;
    name: string;
    calculationType: FeeCalculationType;
    value: number;
    description?: string | null;
    isActive?: boolean;
    sortOrder?: number;
}


export interface AuctionImage {
    url: string;

    thumbnailUrl?: string | null;
    caption?: string | null;

    sortOrder?: number;
    isPrimary?: boolean;

    mediaType: MediaType;
}


export interface AuctionDocument {
    documentType: DocumentType;

    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;

    description?: string | null;
}


export interface CreateAuctionLot {
    itemNumber: number;

    title: string;
    description: string;

    artistName: string;
    medium: string;
    dimensions: string;
    yearCreated: string;

    provenance?: string | null;

    conditionReport?: string | null;
    overallCondition?: string | null;
    frameCondition?: string | null;
    detailedConditionNotes?: string | null;
    restorationHistory?: string | null;

    previousOwner?: string | null;
    acquisitionMethod?: string | null;
    acquisitionDate?: string | null;

    exhibitionHistory?: string | null;

    authenticateBy?: string | null;
    auctheticateDate?: string | null;

    editionType: "UNIQUE" | "LIMITED" | "OPEN";

    startingPrice: number;
    reservePrice?: number | null;

    estimateLow: number;
    estimateHigh: number;

    insureanceValue?: number | null;
    gstRate?: number | null;
    hsnCode?: number | null;

    status?: LotStatus;

    scheduledStartAt?: string | null;
    scheduledEndAt?: string | null;

    shippingInfo?: string | null;

    isFeatured?: boolean;

    images?: AuctionImage[];
    documents?: AuctionDocument[];
}


export interface CreateAuctionPayload {
    title: string;
    slug: string;

    description?: string | null;
    short_description?: string | null;

    auctionType: AuctionType;
    status?: AuctionStatus;

    startTime: string;
    endTime: string;

    startDate: string;
    endDate: string;

    previewStartAt?: string | null;

    registrationRequired: boolean;

    registrationStarts: string;
    registrationDeadline?: string | null;

    timezone: string;

    currency: string;

    isOnline: boolean;

    venue?: string | null;

    termsAndConditions?: string | null;

    categoryUuid: string;
    subCategoryUuid?: string | null;

    shippingStrategy: ShippingStrategy;
    visibility: AuctionVisibility;

    tags: AuctionTag[];

    fees: AuctionFee[];

    lots: CreateAuctionLot[];
}


export interface CreateAuctionResponse {
    success: boolean;
    message: string;
    data: any;
}
