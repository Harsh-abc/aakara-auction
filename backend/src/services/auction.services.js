
import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";

export const createAuctionService = async (data) => {
    const {
        title,
        slug,
        description,
        short_description,
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

    // -----------------------------------
    // Basic validations
    // -----------------------------------

    if (!createdBy) {
        throw new Error("Authenticated user is required");
    }

    if (!Array.isArray(tags)) {
        throw new Error("Tags must be an array");
    }

    if (!Array.isArray(fees)) {
        throw new Error("Fees must be an array");
    }

    if (!Array.isArray(lots)) {
        throw new Error("Lots must be an array");
    }

    // Lots are optional during draft creation.
    // Validate minimum lot requirement when publishing
    // the auction instead of during draft creation.

    return await prisma.$transaction(async (tx) => {

        // -----------------------------------
        // Validate category
        // -----------------------------------

        const category = await tx.category.findUnique({
            where: {
                uuid: categoryUuid,
            },
        });

        if (!category || !category.isActive) {
            throw new Error("Invalid category");
        }

        // -----------------------------------
        // Validate subcategory
        // -----------------------------------

        let subCategory = null;

        if (subCategoryUuid) {
            subCategory = await tx.subCategory.findUnique({
                where: {
                    uuid: subCategoryUuid,
                },
            });

            if (!subCategory || !subCategory.isActive) {
                throw new Error("Invalid subcategory");
            }

            if (subCategory.categoryId !== category.id) {
                throw new Error(
                    "Subcategory does not belong to selected category"
                );
            }
        }

        // -----------------------------------
        // Validate currency
        // -----------------------------------

        const currencyCode = Array.isArray(currency)
            ? currency[0]
            : currency;

        if (
            typeof currencyCode !== "string" ||
            !currencyCode.trim()
        ) {
            throw new Error("Valid currency code is required");
        }

        const currencyRecord = await tx.currency.findUnique({
            where: {
                code: currencyCode.trim().toUpperCase(),
            },
        });

        if (!currencyRecord || !currencyRecord.isActive) {
            throw new Error("Invalid currency");
        }

        // -----------------------------------
        // Create auction
        // -----------------------------------

        const auction = await tx.auction.create({
            data: {
                title,
                slug,
                description,
                short_description,
                coverImageUrl,

                auctionType,
                status: status || "DRAFT",

                startTime: startTime
                    ? new Date(startTime)
                    : null,

                endTime: endTime
                    ? new Date(endTime)
                    : null,

                startDate: startDate
                    ? new Date(startDate)
                    : null,

                endDate: endDate
                    ? new Date(endDate)
                    : null,

                previewStartAt: previewStartAt
                    ? new Date(previewStartAt)
                    : null,

                registrationRequired:
                    registrationRequired ?? true,

                registrationStarts: registrationStarts
                    ? new Date(registrationStarts)
                    : null,

                registrationDeadline:
                    registrationDeadline
                        ? new Date(registrationDeadline)
                        : null,

                timezone: timezone || "Asia/Kolkata",

                currency: {
                    connect: {
                        id: currencyRecord.id,
                    },
                },

                isOnline: isOnline ?? true,

                venue,

                termsAndConditions,

                category: {
                    connect: {
                        id: category.id,
                    },
                },

                subCategory: subCategory
                    ? {
                        connect: {
                            id: subCategory.id,
                        },
                    }
                    : undefined,


                creator: {
                    connect: {
                        id: BigInt(createdBy),
                    },
                },

                shippingStrategy,

                visibility,
            },
        });

        // -----------------------------------
        // Create auction tags
        // -----------------------------------

        for (const tagSlug of tags) {
            const tag = await tx.auctionTag.findUnique({
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

        // -----------------------------------
        // Create auction fees
        // -----------------------------------

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

        // -----------------------------------
        // Create lots
        // -----------------------------------

        if (lots.length > 0) {
            for (const lot of lots) {

                // Validate required lot fields
                if (!lot.itemNumber) {
                    throw new Error(
                        "Lot item number is required"
                    );
                }

                if (!lot.title) {
                    throw new Error(
                        "Lot title is required"
                    );
                }

                if (!lot.editionType) {
                    throw new Error(
                        "Lot edition type is required"
                    );
                }

                // -----------------------------------
                // Create auction item
                // -----------------------------------

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

                            yearCreated:
                                lot.yearCreated,

                            provenance:
                                lot.provenance,

                            conditionReport:
                                lot.conditionReport,

                            overallCondition:
                                lot.overallCondition,

                            frameCondition:
                                lot.frameCondition,

                            detailedConditionNotes:
                                lot.detailedConditionNotes,

                            restorationHistory:
                                lot.restorationHistory,

                            previousOwner:
                                lot.previousOwner,

                            acquisitionMethod:
                                lot.acquisitionMethod,

                            acquisitionDate:
                                lot.acquisitionDate
                                    ? new Date(
                                        lot.acquisitionDate
                                    )
                                    : null,

                            exhibitionHistory:
                                lot.exhibitionHistory,

                            authenticateBy:
                                lot.authenticateBy,

                            auctheticateDate:
                                lot.auctheticateDate
                                    ? new Date(
                                        lot.auctheticateDate
                                    )
                                    : null,

                            editionType:
                                lot.editionType,

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

                            insureanceValue:
                                lot.insureanceValue,

                            gstRate:
                                lot.gstRate,

                            hsnCode:
                                lot.hsnCode,

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

                            // -----------------------------------
                            // Create dimension relation
                            // -----------------------------------

                            dimension: lot.dimension
                                ? {
                                    create: {
                                        width:
                                            lot.dimension.width,

                                        height:
                                            lot.dimension.height,

                                        depth:
                                            lot.dimension.depth,

                                        dimensionUnit:
                                            lot.dimension.dimensionUnit
                                            || "CM",

                                        weight:
                                            lot.dimension.weight,

                                        weightUnit:
                                            lot.dimension.weightUnit
                                            || null,
                                    },
                                }
                                : undefined,
                        },
                    });

                // -----------------------------------
                // Create lot images
                // -----------------------------------

                if (
                    Array.isArray(lot.images) &&
                    lot.images.length > 0
                ) {
                    await tx.auctionImage.createMany({
                        data: lot.images.map((image) => ({
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

                            mediaType:
                                image.mediaType || "IMAGE",
                        })),
                    });
                }

                // -----------------------------------
                // Create lot documents
                // -----------------------------------

                if (
                    Array.isArray(lot.documents) &&
                    lot.documents.length > 0
                ) {
                    await tx.auctionDocument.createMany({
                        data: lot.documents.map((document) => ({
                            itemId:
                                auctionItem.id,

                            documentType:
                                document.documentType
                                || "OTHER",

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
                        })),
                    });
                }
            }
        }

        // -----------------------------------
        // Return created auction
        // -----------------------------------

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
                        dimension: true,

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




export const getAuctionService = async (data = {}) => {
    const {
        search,
        status,
        auctionType,
        categoryUuid,
        visibility,
    } = data;

    const where = {
        deletedAt: null,

        ...(status && {
            status,
        }),

        ...(auctionType && {
            auctionType,
        }),

        ...(visibility && {
            visibility,
        }),

        ...(search && {
            OR: [
                {
                    title: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    slug: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            ],
        }),
    };

    if (categoryUuid) {
        const category = await prisma.category.findUnique({
            where: {
                uuid: categoryUuid,
            },
            select: {
                id: true,
            },
        });

        if (!category) {
            throw new Error("Category not found");
        }

        where.categoryId = category.id;
    }

    const auctions = await prisma.auction.findMany({
        where,

        orderBy: {
            createdAt: "desc",
        },

        include: {
            currency: true,
            category: true,
            subCategory: true,

            creator: {
                select: {
                    id: true,
                    uuid: true,
                    username: true,
                    email: true,
                },
            },

            tags: true,
            auctionFees: true,
        },
    });

    return {
        success: true,
        message: "Auctions fetched successfully",
        data: serializeBigInt(auctions),
    };
};


export const getLotByAuctionId = async (data) => {
    const { auctionUuid } = data;

    if (!auctionUuid) {
        throw new Error("Auction UUID is required");
    }

    // 1. Find auction using UUID
    const auction = await prisma.auction.findUnique({
        where: {
            uuid: auctionUuid,
        },

        select: {
            id: true,
            uuid: true,
            title: true,
            slug: true,
            status: true,
        },
    });

    if (!auction) {
        throw new Error("Auction not found");
    }

    // 2. Fetch all lots belonging to the auction
    const lots = await prisma.auctionItem.findMany({
        where: {
            auctionId: auction.id,
        },

        orderBy: {
            itemNumber: "asc",
        },

        include: {
            images: true,

            documents: true,

            category: true,

            subCategory: true,

            currency: true,

            currentBidder: {
                select: {
                    id: true,
                    uuid: true,
                    username: true,
                    email: true,
                },
            },
        },
    });

    return {
        success: true,

        message: "Lots fetched successfully",

        data: {
            auction: serializeBigInt(auction),
            lots: serializeBigInt(lots),
        },
    };
};