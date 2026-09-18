
import { AuctionFormData } from "@/lib/types/AuctionsFormData";

// ============================================================
// COMBINE DATE + TIME
// ============================================================

const combineDateTime = (
    date: string,
    time: string
): string => {
    if (!date || !time) {
        return "";
    }

    return new Date(
        `${date}T${time}:00`
    ).toISOString();
};

// ============================================================
// BUILD AUCTION FORM DATA
// ============================================================

export const buildAuctionFormData = (
    data: AuctionFormData
): FormData => {
    const formData = new FormData();

    const {
        basicInfo,
        schedule,
        lots,
        fees,
        shipping,
        visibility,
    } = data;

    // ========================================================
    // BASIC INFORMATION
    // ========================================================

    formData.append(
        "title",
        basicInfo.auctionName
    );

    // Backend requires slug.
    // auctionId is currently a frontend/business field
    // and is not present separately in the Auction model.

    const slug = basicInfo.auctionName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    formData.append(
        "slug",
        slug
    );

    formData.append(
        "description",
        basicInfo.description
    );

    formData.append(
        "short_description",
        basicInfo.shortDescription
    );

    formData.append(
        "auctionType",
        basicInfo.auctionType
    );

    formData.append(
        "categoryUuid",
        basicInfo.categoryUuid
    );

    if (basicInfo.subCategoryUuid) {
        formData.append(
            "subCategoryUuid",
            basicInfo.subCategoryUuid
        );
    }

    formData.append(
        "currency",
        JSON.stringify(
            basicInfo.currency
        )
    );

    // ========================================================
    // COVER IMAGE
    // ========================================================

    if (basicInfo.coverImage instanceof File) {
        formData.append(
            "coverImage",
            basicInfo.coverImage
        );
    }

    // ========================================================
    // TAGS
    // ========================================================

    formData.append(
        "tags",
        JSON.stringify(
            basicInfo.auctionTags
        )
    );

    // ========================================================
    // AUCTION SCHEDULE
    // ========================================================

    formData.append(
        "startTime",
        combineDateTime(
            schedule.startDate,
            schedule.startTime
        )
    );

    formData.append(
        "endTime",
        combineDateTime(
            schedule.endDate,
            schedule.endTime
        )
    );

    formData.append(
        "startDate",
        schedule.startDate
    );

    formData.append(
        "endDate",
        schedule.endDate
    );

    if (schedule.previewStartAt) {
        formData.append(
            "previewStartAt",
            schedule.previewStartAt
        );
    }

    formData.append(
        "registrationRequired",
        String(
            schedule.registrationRequired
        )
    );

    formData.append(
        "registrationStarts",
        schedule.registrationStarts
    );

    if (schedule.registrationDeadline) {
        formData.append(
            "registrationDeadline",
            schedule.registrationDeadline
        );
    }

    formData.append(
        "timezone",
        schedule.timezone
    );

    // auctionExtensionTime is currently frontend-only.
    // The current backend create-auction API does not process it.

    // ========================================================
    // SHIPPING
    // ========================================================

    formData.append(
        "shippingStrategy",
        shipping.shippingStrategy
    );

    formData.append(
        "isOnline",
        String(
            shipping.isOnline
        )
    );

    if (shipping.venue) {
        formData.append(
            "venue",
            shipping.venue
        );
    }

    // ========================================================
    // VISIBILITY
    // ========================================================

    formData.append(
        "visibility",
        visibility.visibility
    );

    if (visibility.termsAndConditions) {
        formData.append(
            "termsAndConditions",
            visibility.termsAndConditions
        );
    }

    // ========================================================
    // FEES
    // ========================================================

    const feesPayload = fees.map(
        (fee) => ({
            feeType: fee.feeType,
            name: fee.name,
            calculationType: fee.calculationType,
            value: fee.value ?? 0,
            description: fee.description || null,
            isActive: fee.isActive,
            sortOrder: fee.sortOrder,
        })
    );

    formData.append(
        "fees",
        JSON.stringify(
            feesPayload
        )
    );

    // ========================================================
    // LOTS
    // ========================================================

    const lotsPayload = lots.map(
        (lot, index) => ({
            // ================================================
            // BASIC LOT INFORMATION
            // ================================================

            itemNumber: index + 1,

            title:
                lot.details.title,

            description:
                lot.details.description,

            artistName:
                lot.details.artist,

            medium:
                lot.details.medium,

            yearCreated:
                lot.details.yearCreated,

            // ================================================
            // DIMENSIONS
            // ================================================

            dimensions: [
                lot.details.dimensions.width,
                lot.details.dimensions.height,
                lot.details.dimensions.depth,
            ]
                .filter(
                    (value) =>
                        value !== null &&
                        value !== undefined
                )
                .join(" x "),

            // ================================================
            // PROVENANCE
            // ================================================

            provenance:
                lot.provenance.previousOwner ||
                null,

            previousOwner:
                lot.provenance.previousOwner ||
                null,

            acquisitionMethod:
                lot.provenance.acquisitionMethod ||
                null,

            acquisitionDate:
                lot.provenance.acquisitionDate ||
                null,

            exhibitionHistory:
                lot.provenance.exhibitionHistory ||
                null,

            // ================================================
            // CONDITION
            // ================================================

            conditionReport:
                lot.condition.detailedConditionNotes ||
                null,

            overallCondition:
                lot.condition.overallCondition ||
                null,

            frameCondition:
                lot.condition.frameCondition ||
                null,

            detailedConditionNotes:
                lot.condition.detailedConditionNotes ||
                null,

            restorationHistory:
                lot.condition.restorationHistory ||
                null,

            // ================================================
            // AUTHENTICATION
            // ================================================

            authenticateBy:
                lot.authentication.authenticatedBy ||
                null,

            // Keep backend field name as-is because the
            // current Prisma/service uses this spelling.
            auctheticateDate:
                lot.authentication.authenticatedDate ||
                null,

            // ================================================
            // EDITION
            // ================================================

            editionType:
                lot.details.editionType,

            // ================================================
            // PRICING
            // ================================================

            startingPrice:
                lot.pricing.startingPrice ?? 0,

            reservePrice:
                lot.pricing.reservePrice,

            estimateLow:
                lot.pricing.estimateFrom ?? 0,

            estimateHigh:
                lot.pricing.estimateTo ?? 0,

            insureanceValue:
                lot.pricing.insuranceDeclaredValue,

            gstRate:
                lot.pricing.gstRate,

            hsnCode:
                lot.pricing.hsnCode
                    ? Number(
                        lot.pricing.hsnCode
                    )
                    : null,

            // ================================================
            // LOT STATUS
            // ================================================

            status:
                lot.status,

            // ================================================
            // LOT SCHEDULE
            // ================================================

            scheduledStartAt: null,

            scheduledEndAt: null,

            // ================================================
            // SHIPPING
            // ================================================

            shippingInfo:
                lot.shippingInfo ||
                null,

            // ================================================
            // FEATURED
            // ================================================

            isFeatured:
                lot.isFeatured,

            // ================================================
            // FILE PLACEHOLDERS
            // ================================================

            images: [],

            documents: [],
        })
    );

    formData.append(
        "lots",
        JSON.stringify(
            lotsPayload
        )
    );

    // ========================================================
    // LOT MEDIA + DOCUMENTS
    // ========================================================

    lots.forEach(
        (lot, lotIndex) => {

            // ==================================================
            // IMAGES + VIDEOS
            // ==================================================

            lot.images.forEach(
                (media) => {

                    if (
                        !(media.file instanceof File)
                    ) {
                        return;
                    }

                    // IMAGE
                    if (
                        media.file.type.startsWith(
                            "image/"
                        )
                    ) {
                        formData.append(
                            `lotImages_${lotIndex}`,
                            media.file
                        );

                        return;
                    }

                    // VIDEO
                    if (
                        media.file.type.startsWith(
                            "video/"
                        )
                    ) {
                        formData.append(
                            `lotVideos_${lotIndex}`,
                            media.file
                        );
                    }
                }
            );

            // ==================================================
            // DOCUMENTS
            // ==================================================

            lot.documents.forEach(
                (document) => {

                    if (
                        document.file instanceof File
                    ) {
                        formData.append(
                            `lotDocuments_${lotIndex}`,
                            document.file
                        );
                    }
                }
            );
        }
    );

    return formData;
};
