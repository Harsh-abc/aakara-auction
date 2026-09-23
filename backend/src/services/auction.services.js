import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";

// =====================================================================
// Helpers
// =====================================================================

const httpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const ENUMS = {
    auctionType: ["LIVE", "FLOOR", "HYBRID"],
    auctionStatus: ["DRAFT", "SCHEDULED"], // statuses allowed at creation time
    itemStatus: ["DRAFT", "SCHEDULED"],
    shippingStrategy: [
        "SHIPPING_INCLUDED",
        "SHIPPING_CALCULATED_SEPARATELY",
        "BUYER_ARRANGES_PICKUP",
        "ADMIN_ARRANGES_DELIVERY",
    ],
    visibility: ["PUBLIC", "REGISTERED_USERS_ONLY", "PRIVATE_INVITE_ONLY"],
    feeType: [
        "BUYER_PREMIUM",
        "PLATFORM_FEE",
        "TAX_GST",
        "PAYMENT_PROCESSING",
        "LATE_PAYMENT",
        "SHIPPING",
        "CUSTOM",
    ],
    feeCalculationType: ["PERCENTAGE", "FIXED"],
    editionType: ["UNIQUE", "LIMITED", "OPEN"],
    dimensionUnit: ["CM", "INCH", "MM", "METER", "FEET"],
    weightUnit: ["KG", "GRAM", "LB", "OZ"],
    mediaType: ["IMAGE", "VIDEO"],
    documentType: [
        "CERTIFICATE_OF_AUTHENTICITY",
        "PROVENANCE",
        "APPRAISAL",
        "INSURANCE",
        "OTHER",
    ],
};

const pickEnum = (value, allowed, fallback, label) => {
    if (value === undefined || value === null || value === "") return fallback;
    const normalized = String(value).trim().toUpperCase();
    if (!allowed.includes(normalized)) {
        throw httpError(`Invalid ${label}: ${value}`);
    }
    return normalized;
};

/** "" / null / undefined -> null, otherwise trimmed string */
const toStr = (value) => {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s === "" ? null : s;
};

/** Accepts true/false, "true"/"false", "1"/"0", "on" */
const toBool = (value, fallback) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    const s = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(s)) return true;
    if (["false", "0", "no", "off"].includes(s)) return false;
    return fallback;
};

/** Returns a finite number or null. Throws on garbage input. */
const toNum = (value, label) => {
    if (value === undefined || value === null || value === "") return null;
    const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(n)) throw httpError(`${label} must be a valid number`);
    if (n < 0) throw httpError(`${label} cannot be negative`);
    return n;
};

/** Returns a valid Date or null. Throws on an unparsable value. */
const toDate = (value, label) => {
    if (value === undefined || value === null || value === "") return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) throw httpError(`${label} is not a valid date`);
    return d;
};

const slugify = (text) =>
    String(text)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 180);

/** Currency can arrive as "INR", ["INR"] or the JSON string '["INR"]' */
const resolveCurrencyCode = (currency) => {
    let value = currency;
    if (typeof value === "string" && value.trim().startsWith("[")) {
        try {
            value = JSON.parse(value);
        } catch {
            /* fall through */
        }
    }
    if (Array.isArray(value)) value = value[0];
    if (typeof value !== "string" || !value.trim()) {
        throw httpError("Valid currency code is required");
    }
    return value.trim().toUpperCase();
};

/** HSN codes are digits; the column is Decimal, so strip spaces/dots. */
const toHsn = (value) => {
    const s = toStr(value);
    if (!s) return null;
    const digits = s.replace(/\D/g, "");
    if (!digits) throw httpError(`Invalid HSN code: ${value}`);
    if (digits.length > 10) throw httpError("HSN code is too long");
    return Number(digits);
};

/** Finds a free slug: "my-auction", "my-auction-2", "my-auction-3", ... */
const uniqueAuctionSlug = async (tx, base) => {
    const root = slugify(base) || `auction-${Date.now()}`;
    const taken = await tx.auction.findMany({
        where: { slug: { startsWith: root } },
        select: { slug: true },
    });
    const set = new Set(taken.map((a) => a.slug));
    if (!set.has(root)) return root;
    for (let i = 2; i < 1000; i++) {
        const candidate = `${root}-${i}`;
        if (!set.has(candidate)) return candidate;
    }
    return `${root}-${Date.now()}`;
};

// =====================================================================
// Input normalisation (runs BEFORE the transaction so bad input fails fast)
// =====================================================================

const normalizeLot = (lot, index, { isDraft }) => {
    const n = index + 1;
    const label = (field) => `Lot ${n}: ${field}`;

    const title = toStr(lot.title);
    if (!title) throw httpError(label("title is required"));

    const startingPrice = toNum(lot.startingPrice, label("starting price"));
    if (!isDraft && (startingPrice === null || startingPrice <= 0)) {
        throw httpError(label("starting price is required"));
    }

    const estimateLow = toNum(lot.estimateLow, label("estimate low"));
    const estimateHigh = toNum(lot.estimateHigh, label("estimate high"));
    if (estimateLow !== null && estimateHigh !== null && estimateLow > estimateHigh) {
        throw httpError(label("estimate low cannot be greater than estimate high"));
    }

    const reservePrice = toNum(lot.reservePrice, label("reserve price"));

    // ---- dimension (optional) ----
    let dimension = null;
    const d = lot.dimension;
    if (d && typeof d === "object") {
        const width = toNum(d.width, label("width"));
        const height = toNum(d.height, label("height"));
        const depth = toNum(d.depth, label("depth"));
        const weight = toNum(d.weight, label("weight"));

        if ([width, height, depth, weight].some((v) => v !== null)) {
            dimension = {
                width,
                height,
                depth,
                dimensionUnit: pickEnum(d.dimensionUnit, ENUMS.dimensionUnit, "CM", label("dimension unit")),
                weight,
                weightUnit:
                    weight !== null
                        ? pickEnum(d.weightUnit, ENUMS.weightUnit, "KG", label("weight unit"))
                        : null,
            };
        }
    }

    // ---- media ----
    const images = (Array.isArray(lot.images) ? lot.images : [])
        .filter((img) => img && img.url)
        .map((img, i) => ({
            url: img.url,
            thumbnailUrl: toStr(img.thumbnailUrl),
            caption: toStr(img.caption),
            sortOrder: Number.isInteger(img.sortOrder) ? img.sortOrder : i,
            isPrimary: Boolean(img.isPrimary),
            mediaType: pickEnum(img.mediaType, ENUMS.mediaType, "IMAGE", label("media type")),
        }));

    // exactly one primary IMAGE (videos can't be primary)
    const primaryIdx = images.findIndex((img) => img.isPrimary && img.mediaType === "IMAGE");
    const fallbackIdx = images.findIndex((img) => img.mediaType === "IMAGE");
    const chosen = primaryIdx !== -1 ? primaryIdx : fallbackIdx;
    images.forEach((img, i) => {
        img.isPrimary = i === chosen;
    });

    const documents = (Array.isArray(lot.documents) ? lot.documents : [])
        .filter((doc) => doc && doc.fileUrl)
        .map((doc) => ({
            documentType: pickEnum(doc.documentType, ENUMS.documentType, "OTHER", label("document type")),
            fileUrl: doc.fileUrl,
            fileName: toStr(doc.fileName) || "document",
            mimeType: toStr(doc.mimeType) || "application/octet-stream",
            fileSize: Number(doc.fileSize) || 0,
            description: toStr(doc.description),
        }));

    return {
        itemNumber: toNum(lot.itemNumber, label("item number")) ?? n,
        title,
        description: toStr(lot.description),
        artistName: toStr(lot.artistName),
        medium: toStr(lot.medium),
        yearCreated: toStr(lot.yearCreated),
        provenance: toStr(lot.provenance),
        conditionReport: toStr(lot.conditionReport),
        overallCondition: toStr(lot.overallCondition),
        frameCondition: toStr(lot.frameCondition),
        detailedConditionNotes: toStr(lot.detailedConditionNotes),
        restorationHistory: toStr(lot.restorationHistory),
        previousOwner: toStr(lot.previousOwner),
        acquisitionMethod: toStr(lot.acquisitionMethod),
        // NOTE: acquisitionDate is a String column in the schema — keep it as "YYYY-MM-DD"
        acquisitionDate: toStr(lot.acquisitionDate),
        exhibitionHistory: toStr(lot.exhibitionHistory),
        authenticateBy: toStr(lot.authenticateBy),
        auctheticateDate: toDate(lot.auctheticateDate, label("authentication date")),
        editionType: pickEnum(lot.editionType, ENUMS.editionType, "UNIQUE", label("edition type")),
        startingPrice: startingPrice ?? 0,
        reservePrice,
        estimateLow,
        estimateHigh,
        insureanceValue: toNum(lot.insureanceValue, label("insurance value")),
        gstRate: toNum(lot.gstRate, label("GST rate")),
        hsnCode: toHsn(lot.hsnCode),
        status: pickEnum(lot.status, ENUMS.itemStatus, "DRAFT", label("status")),
        scheduledStartAt: toDate(lot.scheduledStartAt, label("scheduled start")),
        scheduledEndAt: toDate(lot.scheduledEndAt, label("scheduled end")),
        shippingInfo: toStr(lot.shippingInfo),
        isFeatured: toBool(lot.isFeatured, false),
        dimension,
        images,
        documents,
    };
};

const normalizeFees = (fees) =>
    fees.map((fee, i) => {
        const name = toStr(fee.name);
        if (!name) throw httpError(`Fee ${i + 1}: name is required`);
        const value = toNum(fee.value, `Fee "${name}" value`) ?? 0;
        const calculationType = pickEnum(
            fee.calculationType,
            ENUMS.feeCalculationType,
            "FIXED",
            `fee calculation type for "${name}"`
        );
        if (calculationType === "PERCENTAGE" && value > 100) {
            throw httpError(`Fee "${name}" cannot exceed 100%`);
        }
        return {
            feeType: pickEnum(fee.feeType, ENUMS.feeType, "CUSTOM", `fee type for "${name}"`),
            name,
            calculationType,
            value,
            description: toStr(fee.description),
            isActive: toBool(fee.isActive, true),
            sortOrder: Number.isInteger(fee.sortOrder) ? fee.sortOrder : i,
        };
    });

const normalizeTags = (tags) => {
    const seen = new Map();
    for (const raw of tags) {
        const name = toStr(typeof raw === "object" && raw ? raw.name ?? raw.slug : raw);
        if (!name) continue;
        const slug = slugify(name);
        if (slug && !seen.has(slug)) seen.set(slug, name);
    }
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
};

// =====================================================================
// CREATE AUCTION
// =====================================================================

export const createAuctionService = async (data) => {
    const {
        title: rawTitle,
        slug: rawSlug,
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

    // ---------------- basic validation ----------------
    if (!createdBy) throw httpError("Authenticated user is required", 401);
    if (!Array.isArray(tags)) throw httpError("Tags must be an array");
    if (!Array.isArray(fees)) throw httpError("Fees must be an array");
    if (!Array.isArray(lots)) throw httpError("Lots must be an array");

    const title = toStr(rawTitle);
    if (!title) throw httpError("Auction title is required");
    if (!toStr(categoryUuid)) throw httpError("Category is required");

    const auctionStatus = pickEnum(status, ENUMS.auctionStatus, "DRAFT", "auction status");
    const isDraft = auctionStatus === "DRAFT";

    const start = toDate(startTime, "Start time");
    const end = toDate(endTime, "End time");
    if (!start) throw httpError("Auction start date and time are required");
    if (!end) throw httpError("Auction end date and time are required");
    if (end <= start) {
        throw httpError(
            `Auction end time must be after the start time (received start=${start.toISOString()}, end=${end.toISOString()})`
        );
    }

    // A published auction can't start in the past (1 min grace for clock skew).
    // Drafts are allowed so admins can save work-in-progress.
    if (!isDraft && start.getTime() < Date.now() - 60_000) {
        throw httpError("Auction start time cannot be in the past");
    }

    const regStarts = toDate(registrationStarts, "Registration start");
    const regDeadline = toDate(registrationDeadline, "Registration deadline");
    if (regStarts && regDeadline && regDeadline < regStarts) {
        throw httpError("Registration deadline must be after registration start");
    }

    if (!isDraft && lots.length === 0) {
        throw httpError("Add at least one lot before publishing the auction");
    }

    const currencyCode = resolveCurrencyCode(currency);
    const normalizedTags = normalizeTags(tags);
    const normalizedFees = normalizeFees(fees);
    const normalizedLots = lots.map((lot, i) => normalizeLot(lot, i, { isDraft }));

    const itemNumbers = normalizedLots.map((l) => l.itemNumber);
    if (new Set(itemNumbers).size !== itemNumbers.length) {
        throw httpError("Lot item numbers must be unique");
    }

    // ---------------- transaction ----------------
    return prisma.$transaction(
        async (tx) => {
            const category = await tx.category.findUnique({ where: { uuid: categoryUuid } });
            if (!category || !category.isActive) throw httpError("Invalid category");

            let subCategory = null;
            if (toStr(subCategoryUuid)) {
                subCategory = await tx.subCategory.findUnique({ where: { uuid: subCategoryUuid } });
                if (!subCategory || !subCategory.isActive) throw httpError("Invalid subcategory");
                if (subCategory.categoryId !== category.id) {
                    throw httpError("Subcategory does not belong to selected category");
                }
            }

            const currencyRecord = await tx.currency.findUnique({ where: { code: currencyCode } });
            if (!currencyRecord || !currencyRecord.isActive) {
                throw httpError(`Invalid currency: ${currencyCode}`);
            }

            const slug = await uniqueAuctionSlug(tx, toStr(rawSlug) || title);

            const auction = await tx.auction.create({
                data: {
                    title,
                    slug,
                    description: toStr(description),
                    short_description: toStr(short_description),
                    coverImageUrl: toStr(coverImageUrl),
                    auctionType: pickEnum(auctionType, ENUMS.auctionType, "FLOOR", "auction type"),
                    status: auctionStatus,
                    startTime: start,
                    endTime: end,
                    startDate: toDate(startDate, "Start date") ?? start,
                    endDate: toDate(endDate, "End date") ?? end,
                    previewStartAt: toDate(previewStartAt, "Preview start"),
                    registrationRequired: toBool(registrationRequired, true),
                    registrationStarts: regStarts,
                    registrationDeadline: regDeadline,
                    timezone: toStr(timezone) || "Asia/Kolkata",
                    isOnline: toBool(isOnline, true),
                    venue: toStr(venue),
                    termsAndConditions: toStr(termsAndConditions),
                    publishedAt: isDraft ? null : new Date(),
                    shippingStrategy: pickEnum(
                        shippingStrategy,
                        ENUMS.shippingStrategy,
                        "SHIPPING_CALCULATED_SEPARATELY",
                        "shipping strategy"
                    ),
                    visibility: pickEnum(visibility, ENUMS.visibility, "REGISTERED_USERS_ONLY", "visibility"),
                    currency: { connect: { id: currencyRecord.id } },
                    category: { connect: { id: category.id } },
                    ...(subCategory && { subCategory: { connect: { id: subCategory.id } } }),
                    creator: { connect: { id: BigInt(createdBy) } },
                },
            });

            // status history (first entry)
            await tx.auctionStatusHistory.create({
                data: {
                    auctionId: auction.id,
                    fromStatus: null,
                    toStatus: auctionStatus,
                    changedBy: BigInt(createdBy),
                    reason: "Auction created",
                },
            });

            // ---------------- tags (create if missing) ----------------
            for (const { slug: tagSlug, name } of normalizedTags) {
                const tag = await tx.auctionTag.upsert({
                    where: { slug: tagSlug },
                    update: {},
                    create: { name, slug: tagSlug },
                });
                if (!tag.isActive) throw httpError(`Tag "${name}" is disabled`);
                await tx.auctionTagRelation.create({
                    data: { auctionId: auction.id, tagId: tag.id },
                });
            }

            // ---------------- fees ----------------
            if (normalizedFees.length > 0) {
                await tx.auctionFee.createMany({
                    data: normalizedFees.map((fee) => ({ ...fee, auctionId: auction.id })),
                });
            }

            // ---------------- lots ----------------
            for (const lot of normalizedLots) {
                const { dimension, images, documents, ...itemData } = lot;

                const item = await tx.auctionItem.create({
                    data: {
                        ...itemData,
                        auctionId: auction.id,
                        categoryId: category.id,
                        subCategoryId: subCategory?.id ?? null,
                        currencyId: currencyRecord.id,
                        ...(dimension && { dimension: { create: dimension } }),
                    },
                });

                if (images.length > 0) {
                    await tx.auctionImage.createMany({
                        data: images.map((img) => ({ ...img, itemId: item.id })),
                    });
                }

                if (documents.length > 0) {
                    await tx.auctionDocument.createMany({
                        data: documents.map((doc) => ({ ...doc, itemId: item.id })),
                    });
                }
            }

            return tx.auction.findUnique({
                where: { id: auction.id },
                include: {
                    category: true,
                    subCategory: true,
                    currency: true,
                    tags: { include: { tag: true } },
                    auctionFees: { orderBy: { sortOrder: "asc" } },
                    items: {
                        include: {
                            dimension: true,
                            images: { orderBy: { sortOrder: "asc" } },
                            documents: true,
                        },
                        orderBy: { itemNumber: "asc" },
                    },
                },
            });
        },
        {
            // Supabase pooler + many lots can exceed Prisma's 5s default
            maxWait: 10_000,
            timeout: 60_000,
        }
    );
};

// =====================================================================
// GET AUCTIONS (unchanged behaviour, tags now include tag details)
// =====================================================================

export const getAuctionService = async (data = {}) => {
    const { search, status, auctionType, categoryUuid, visibility } = data;

    const where = {
        deletedAt: null,
        ...(status && { status }),
        ...(auctionType && { auctionType }),
        ...(visibility && { visibility }),
        ...(search && {
            OR: [
                { title: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
            ],
        }),
    };

    if (categoryUuid) {
        const category = await prisma.category.findUnique({
            where: { uuid: categoryUuid },
            select: { id: true },
        });
        if (!category) throw httpError("Category not found", 404);
        where.categoryId = category.id;
    }

    const auctions = await prisma.auction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            currency: true,
            category: true,
            subCategory: true,
            creator: { select: { id: true, uuid: true, username: true, email: true } },
            tags: { include: { tag: true } },
            auctionFees: true,
            _count: { select: { items: true } },
        },
    });

    return {
        success: true,
        message: "Auctions fetched successfully",
        data: serializeBigInt(auctions),
    };
};

// =====================================================================
// GET LOTS BY AUCTION
// =====================================================================

export const getLotByAuctionId = async ({ auctionUuid }) => {
    if (!auctionUuid) throw httpError("Auction UUID is required");

    const auction = await prisma.auction.findUnique({
        where: { uuid: auctionUuid },
        select: { id: true, uuid: true, title: true, slug: true, status: true },
    });
    if (!auction) throw httpError("Auction not found", 404);

    const lots = await prisma.auctionItem.findMany({
        where: { auctionId: auction.id },
        orderBy: { itemNumber: "asc" },
        include: {
            dimension: true,
            images: { orderBy: { sortOrder: "asc" } },
            documents: true,
            category: true,
            subCategory: true,
            currency: true,
            currentBidder: { select: { id: true, uuid: true, username: true, email: true } },
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