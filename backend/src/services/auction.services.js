import prisma from "../libs/prisma.js";

export const createAuctionService = async (data) => {
    const {
        title,
        slug,
        description,
        coverImageUrl,

        auctionType,
        status,

        startTime,
        endTime,
        startDate,
        endDate,

        previewStartAt,

        registrationRequired,
        registrationStarts,
        registrationDeadline,

        timezone,

        currency,

        isOnline,
        venue,

        termsAndConditions,

        categoryUuid,
        subCategoryUuid,

        shippingStrategy,
        visibility,

        tags = [],
        fees = [],
        lots = [],

        createdBy,
    } = data;

    if (!createdBy) {
        throw new Error("Authenticated user is required");
    }

    if (!lots.length) {
        throw new Error("At least one lot is required");
    }

    return await prisma.$transaction(async (tx) => {


        const category = await tx.category.findUnique({
            where: {
                uuid: categoryUuid,
            },
        });

        if (!category || !category.isActive) {
            throw new Error("Invalid category");
        }


        let subCategory = null;

        if (subCategoryUuid) {
            subCategory = await tx.subCategory.findUnique({
                where: {
                    uuid: subCategoryUuid,
                },
            });

            if (
                !subCategory ||
                !subCategory.isActive
            ) {
                throw new Error(
                    "Invalid subcategory"
                );
            }

            if (
                subCategory.categoryId !== category.id
            ) {
                throw new Error(
                    "Subcategory does not belong to selected category"
                );
            }
        }



        const currencyRecord =
            await tx.currency.findUnique({
                where: {
                    code: currency,
                },
            });

        if (
            !currencyRecord ||
            !currencyRecord.isActive
        ) {
            throw new Error(
                "Invalid currency"
            );
        }



        const auction =
            await tx.auction.create({
                data: {
                    title,
                    slug,
                    description,
                    coverImageUrl,

                    auctionType,
                    status: status || "DRAFT",

                    startTime: new Date(startTime),
                    endTime: new Date(endTime),

                    startDate: new Date(startDate),
                    endDate: new Date(endDate),

                    previewStartAt:
                        previewStartAt
                            ? new Date(previewStartAt)
                            : null,

                    registrationRequired:
                        registrationRequired ?? true,

                    registrationStarts:
                        new Date(registrationStarts),

                    registrationDeadline:
                        registrationDeadline
                            ? new Date(
                                registrationDeadline
                            )
                            : null,

                    timezone:
                        timezone || "Asia/Kolkata",

                    currencyId:
                        currencyRecord.id,

                    isOnline:
                        isOnline ?? true,

                    venue,

                    termsAndConditions,

                    categoryId:
                        category.id,

                    subCategoryId:
                        subCategory?.id ?? null,

                    createdBy,

                    shippingStrategy,

                    visibility,
                },
            });


        for (const tagSlug of tags) {

            const tag =
                await tx.auctionTag.findUnique({
                    where: {
                        slug: tagSlug,
                    },
                });

            if (!tag || !tag.isActive) {
                throw new Error(
                    `Invalid auction tag: ${tagSlug}`
                );
            }

            await tx.auctionTagRelation.create({
                data: {
                    auctionId: auction.id,
                    tagId: tag.id,
                },
            });
        }


        for (const fee of fees) {

            await tx.auctionFee.create({
                data: {
                    auctionId: auction.id,

                    feeType: fee.feeType,

                    name: fee.name,

                    calculationType:
                        fee.calculationType,

                    value: fee.value,

                    description:
                        fee.description,

                    isActive:
                        fee.isActive ?? true,

                    sortOrder:
                        fee.sortOrder ?? 0,
                },
            });
        }

        for (const lot of lots) {

            const auctionItem =
                await tx.auctionItem.create({
                    data: {

                        auctionId:
                            auction.id,

                        itemNumber:
                            lot.itemNumber,

                        title:
                            lot.title,

                        description:
                            lot.description,

                        artistName:
                            lot.artistName,

                        medium:
                            lot.medium,

                        dimensions:
                            lot.dimensions,

                        yearCreated:
                            lot.yearCreated,

                        provenance:
                            lot.provenance,

                        conditionReport:
                            lot.conditionReport,

                        startingPrice:
                            lot.startingPrice,

                        reservePrice:
                            lot.reservePrice,

                        estimateLow:
                            lot.estimateLow,

                        estimateHigh:
                            lot.estimateHigh,

                        status:
                            lot.status || "DRAFT",

                        scheduledStartAt:
                            lot.scheduledStartAt
                                ? new Date(
                                    lot.scheduledStartAt
                                )
                                : null,

                        scheduledEndAt:
                            lot.scheduledEndAt
                                ? new Date(
                                    lot.scheduledEndAt
                                )
                                : null,

                        shippingInfo:
                            lot.shippingInfo,

                        isFeatured:
                            lot.isFeatured ?? false,

                        categoryId:
                            category.id,

                        subCategoryId:
                            subCategory?.id ?? null,

                        currencyId:
                            currencyRecord.id,
                    },
                });

            if (
                lot.images &&
                lot.images.length > 0
            ) {
                await tx.auctionImage.createMany({
                    data: lot.images.map(
                        (image) => ({
                            itemId:
                                auctionItem.id,

                            url:
                                image.url,

                            thumbnailUrl:
                                image.thumbnailUrl,

                            caption:
                                image.caption,

                            sortOrder:
                                image.sortOrder ?? 0,

                            isPrimary:
                                image.isPrimary ?? false,
                        })
                    ),
                });
            }



            if (
                lot.documents &&
                lot.documents.length > 0
            ) {
                await tx.auctionDocument.createMany({
                    data: lot.documents.map(
                        (document) => ({
                            itemId:
                                auctionItem.id,

                            documentType:
                                document.documentType ||
                                "OTHER",

                            fileUrl:
                                document.fileUrl,

                            fileName:
                                document.fileName,

                            mimeType:
                                document.mimeType,

                            fileSize:
                                document.fileSize,

                            description:
                                document.description,
                        })
                    ),
                });
            }
        }


        return await tx.auction.findUnique({
            where: {
                id: auction.id,
            },

            include: {
                category: true,
                subCategory: true,
                currency: true,

                tags: {
                    include: {
                        tag: true,
                    },
                },

                auctionFees: true,

                items: {
                    include: {
                        images: true,
                        documents: true,
                    },

                    orderBy: {
                        itemNumber: "asc",
                    },
                },
            },
        });
    });
};