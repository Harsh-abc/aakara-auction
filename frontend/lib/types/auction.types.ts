// =====================================================================
// AUCTION TYPES — single source of truth
// Mirrors the Prisma enums in schema.prisma.
//
// JSON notes:
//   - Prisma Decimal columns (prices) arrive as STRINGS
//   - BigInt ids arrive as strings via serializeBigInt
//   - DateTime columns arrive as ISO strings
// =====================================================================

// =====================================================================
// ENUMS
// =====================================================================

export type AuctionType = "LIVE" | "FLOOR" | "HYBRID";

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

export type FeeCalculationType = "PERCENTAGE" | "FIXED";

export type LotStatus =
    | "DRAFT"
    | "SCHEDULED"
    | "ACTIVE"
    | "SOLD"
    | "UNSOLD"
    | "PASSED"
    | "WITHDRAWN";

/** Matches Prisma `AuctionDocumentType` */
export type DocumentType =
    | "CERTIFICATE_OF_AUTHENTICITY"
    | "PROVENANCE"
    | "APPRAISAL"
    | "INSURANCE"
    | "OTHER";

export type MediaType = "IMAGE" | "VIDEO";

export type EditionType = "UNIQUE" | "LIMITED" | "OPEN";

export type DimensionUnit = "CM" | "INCH" | "MM" | "METER" | "FEET";

export type WeightUnit = "KG" | "GRAM" | "LB" | "OZ";

export type AuctionTag = string;

// =====================================================================
// SHARED SUB-TYPES
// =====================================================================

export interface AuctionFee {
    feeType: FeeType;
    name: string;
    calculationType: FeeCalculationType;
    value: number | string; // number when sending, string (Decimal) when receiving
    description?: string | null;
    isActive?: boolean;
    sortOrder?: number | string;
}

export interface AuctionImage {
    url: string;
    thumbnailUrl?: string | null;
    caption?: string | null;
    sortOrder?: number | string;
    isPrimary?: boolean;
    mediaType: MediaType;
}

export interface AuctionDocument {
    documentType: DocumentType;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number | string;
    description?: string | null;
}

export interface AuctionDimension {
    width: number | string | null;
    height: number | string | null;
    depth: number | string | null;
    dimensionUnit: DimensionUnit;
    weight: number | string | null;
    weightUnit: WeightUnit | null;
}

// =====================================================================
// CREATE AUCTION — REQUEST (shape of the JSON inside the multipart body)
// Built by utils/buildAuctionFormData.ts
// =====================================================================

export interface CreateAuctionLot {
    itemNumber: number;

    title: string;
    description?: string | null;

    artistName?: string | null;
    medium?: string | null;
    yearCreated?: string | null;

    dimension?: AuctionDimension | null;

    provenance?: string | null;

    conditionReport?: string | null;
    overallCondition?: string | null;
    frameCondition?: string | null;
    detailedConditionNotes?: string | null;
    restorationHistory?: string | null;

    previousOwner?: string | null;
    acquisitionMethod?: string | null;
    acquisitionDate?: string | null; // "yyyy-MM-dd"

    exhibitionHistory?: string | null;

    authenticateBy?: string | null;
    auctheticateDate?: string | null; // ISO — spelling matches Prisma

    editionType: EditionType;

    startingPrice: number | null;
    reservePrice?: number | null;
    estimateLow?: number | null;
    estimateHigh?: number | null;

    insureanceValue?: number | null; // spelling matches Prisma
    gstRate?: number | null;
    hsnCode?: string | null;

    status?: LotStatus;

    scheduledStartAt?: string | null;
    scheduledEndAt?: string | null;

    shippingInfo?: string | null;
    isFeatured?: boolean;

    /** Index-aligned with files sent as lotMedia_{i} */
    mediaMeta?: { isPrimary: boolean; caption?: string | null }[];

    /** Index-aligned with files sent as lotDocuments_{i} */
    documentMeta?: { documentType: DocumentType; description: string | null }[];
}

export interface CreateAuctionPayload {
    status?: Extract<AuctionStatus, "DRAFT" | "SCHEDULED">;

    title: string;
    slug?: string;

    description?: string | null;
    short_description?: string | null;

    auctionType: AuctionType;

    startTime: string;
    endTime: string;
    startDate?: string;
    endDate?: string;

    previewStartAt?: string | null;

    registrationRequired: boolean;
    registrationStarts?: string | null;
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

// =====================================================================
// RESPONSE MODELS
// =====================================================================

export interface Auction {
    id?: string;
    uuid: string;
    title: string;
    slug: string;
    description?: string | null;
    short_description?: string | null;
    coverImageUrl?: string | null;
    status: AuctionStatus;
    auctionType: AuctionType;
    visibility?: AuctionVisibility;
    shippingStrategy?: ShippingStrategy;

    startTime: string;
    endTime: string;
    startDate?: string | null;
    endDate?: string | null;
    previewStartAt?: string | null;
    registrationRequired?: boolean;
    registrationStarts?: string | null;
    registrationDeadline?: string | null;
    timezone?: string | null;
    isOnline?: boolean;
    venue?: string | null;
    termsAndConditions?: string | null;
    publishedAt?: string | null;

    category?: { uuid: string; name: string; slug?: string };
    subCategory?: { uuid: string; name: string; slug?: string } | null;
    currency?: { code: string; name: string; symbol?: string | null };
    /** Allowed currencies, primary first */
    auctionCurrencies?: { isPrimary: boolean; currency: { code: string; name?: string; symbol?: string | null } }[];
    creator?: { uuid: string; username: string; email: string };

    tags?: { tag: { name: string; slug: string } }[];
    auctionFees?: (AuctionFee & { uuid: string })[];
    /** Only the EXTENSION_TRIGGER rule is returned; value = minutes (Decimal string) */
    rules?: { ruleType: string; value: string | number; isActive?: boolean; description?: string | null }[];
    _count?: { items: number };

    createdAt: string;
    updatedAt: string;
}

export interface AuctionLot {
    id?: string;
    uuid: string;
    itemNumber: string | number;
    title: string;
    description?: string | null;
    artistName?: string | null;
    medium?: string | null;
    yearCreated?: string | null;
    editionType: EditionType;
    status: LotStatus;

    scheduledStartAt: string; // ISO, inside the auction window
    scheduledEndAt: string;

    startingPrice: string;
    reservePrice?: string | null;
    estimateLow?: string | null;
    estimateHigh?: string | null;
    currentBid?: string | null;
    bidCount?: string | number;
    isFeatured: boolean;

    insureanceValue?: string | null; // spelling matches Prisma
    gstRate?: string | null;
    hsnCode?: string | null;
    shippingInfo?: string | null;

    overallCondition?: string | null;
    frameCondition?: string | null;
    detailedConditionNotes?: string | null;
    restorationHistory?: string | null;

    previousOwner?: string | null;
    acquisitionMethod?: string | null;
    acquisitionDate?: string | null; // "yyyy-MM-dd" (String column)
    exhibitionHistory?: string | null;

    authenticateBy?: string | null;
    auctheticateDate?: string | null; // spelling matches Prisma

    dimension?: AuctionDimension | null;

    images: (AuctionImage & { id?: string })[];
    documents: (AuctionDocument & { id?: string })[];
    currency?: { code: string; symbol?: string | null } | null;
}

// =====================================================================
// API RESPONSES
// =====================================================================

export interface CreateAuctionResponse {
    success: boolean;
    message: string;
    data: Auction & { items?: AuctionLot[] };
}

export interface GetAuctionsResponse {
    success: boolean;
    message: string;
    data: Auction[];
}

export interface GetAuctionLotsResponse {
    success: boolean;
    message: string;
    data: {
        auction: { uuid: string; title: string; slug: string; status: AuctionStatus };
        lots: AuctionLot[];
    };
}

// =====================================================================
// API PARAMS
// =====================================================================

export interface GetAuctionsParams {
    search?: string;
    status?: string;
    auctionType?: string;
    categoryUuid?: string;
    visibility?: string;
}

export interface GetAuctionsLotsParams {
    auctionUuid: string;
}


export interface DeleteAuctionResponse {
    success: boolean;
    message: string;
    data: { uuid: string; deletedLots: number };
}


export type UpdateAuctionResponse = CreateAuctionResponse;

export interface UpdateAuctionParams {
    auctionUuid: string;
    formData: FormData;
}

// =====================================================================
// PAST / UPCOMING AUCTIONS
// =====================================================================

export type AuctionTimelineType = "past" | "upcoming";

export interface TimelineAuction {
    uuid: string;
    title: string;
    slug: string;
    status: AuctionStatus;
    auctionType: AuctionType;
    coverImageUrl: string | null;
    startTime: string;
    endTime: string;
    previewStartAt: string | null;
    registrationDeadline: string | null;
    isOnline: boolean;
    venue: string | null;
    currency: { code: string; symbol: string | null };
    category: { name: string } | null;
    subCategory: { name: string } | null;
    lotCount: number;

    /** upcoming only */
    verifiedBidders?: number;
    estimate?: { low: number; high: number; currency: string };

    /** past only — money in the auction's primary currency */
    results?: {
        sold: number;
        unsold: number;
        withdrawn: number;
        sellThrough: number;
        totalSold: number;
        currency: string;
    };
}

export interface GetAuctionTimelineParams {
    type: AuctionTimelineType;
    page?: number;
    limit?: number;
    search?: string;
}

export interface GetAuctionTimelineResponse {
    success: boolean;
    message: string;
    data: {
        auctions: TimelineAuction[];
        summary: {
            total: number;
            byStatus: Partial<Record<AuctionStatus, number>>;
            startingIn24h?: number;
        };
        pagination: { page: number; limit: number; total: number; totalPages: number };
    };
}

// =====================================================================
// LIVE FLOOR
// =====================================================================

export interface LiveAuctionSummary {
    uuid: string;
    title: string;
    status: AuctionStatus; // LIVE | PAUSED
    auctionType: AuctionType;
    coverImageUrl: string | null;
    startTime: string;
    endTime: string;
    currency: { code: string; symbol: string | null };
    auctioneer: string | null;
    lotCount: number;
    closedLots: number;
    liveLot: { uuid: string; itemNumber: string; title: string } | null;
    verifiedBidders: number;
    /** Sum over lots in the auction's primary currency */
    estimate: { low: number; high: number; currency: string };
}

export interface GetLiveAuctionsResponse {
    success: boolean;
    message: string;
    data: LiveAuctionSummary[];
}

export interface SetLotLiveParams {
    lotUuid: string;
    action: "start" | "stop";
}

export interface SetLotLiveResponse {
    success: boolean;
    message: string;
    data: {
        uuid: string;
        itemNumber: string;
        title: string;
        status: LotStatus;
        currentBid: string | null;
        bidCount: string;
    };
}

export interface ChangeAuctionStatusParams {
    auctionUuid: string;
    status: AuctionStatus;
    reason?: string;
}

export interface ChangeAuctionStatusResponse {
    success: boolean;
    message: string;
    data: {
        uuid: string;
        title: string;
        status: AuctionStatus;
        publishedAt: string | null;
        updatedAt: string;
    };
}