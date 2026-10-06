import prisma from "../libs/prisma.js";
import { serializeBigInt } from "../utils/serialize.js";
import { syncParticipantsToLots } from "./auctionParticipant.services.js";

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

/**
 * ✅ NEW — allowed currencies + primary.
 *   currencies:      ["INR","USD"] | '["INR","USD"]' | "INR"   (allowed list)
 *   primaryCurrency: "INR"                                     (must be in the list)
 * Falls back to the old single `currency` field so older clients still work.
 */
const resolveCurrencies = ({ currencies, primaryCurrency, currency }) => {
    let list = currencies ?? currency;
    if (typeof list === "string" && list.trim().startsWith("[")) {
        try {
            list = JSON.parse(list);
        } catch {
            throw httpError("Invalid currencies list");
        }
    }
    if (!Array.isArray(list)) list = list ? [list] : [];

    const codes = [
        ...new Set(
            list
                .map((c) => (typeof c === "string" ? c.trim().toUpperCase() : ""))
                .filter(Boolean)
        ),
    ];
    if (codes.length === 0) throw httpError("Select at least one currency");

    const primary = (toStr(primaryCurrency) || codes[0]).toUpperCase();
    if (!codes.includes(primary)) {
        throw httpError(`Primary currency ${primary} must be one of the selected currencies`);
    }

    return { codes, primary };
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
        // ✅ NEW — lot's currency code; turned into a currencyId inside the transaction
        currencyCode: toStr(lot.currency)?.toUpperCase() ?? null,
        dimension,
        images,
        documents,
    };
};

/**
 * Every lot runs inside the auction window:
 *   auction.startTime <= lot.scheduledStartAt < lot.scheduledEndAt <= auction.endTime
 * A lot without its own start/end inherits the auction's.
 */
const applyLotSchedule = (lots, auctionStart, auctionEnd) => {
    lots.forEach((lot, i) => {
        const label = (msg) => `Lot ${i + 1}: ${msg}`;

        lot.scheduledStartAt = lot.scheduledStartAt ?? auctionStart;
        lot.scheduledEndAt = lot.scheduledEndAt ?? auctionEnd;

        if (lot.scheduledStartAt < auctionStart) {
            throw httpError(label("start cannot be before the auction start"));
        }
        if (lot.scheduledEndAt > auctionEnd) {
            throw httpError(label("end cannot be after the auction end"));
        }
        if (lot.scheduledEndAt <= lot.scheduledStartAt) {
            throw httpError(label("end must be after the start"));
        }
    });
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

/** Bids placed in the last N minutes of an auction trigger an extension. */
const EXTENSION_TRIGGER_WINDOW_MINUTES = 2;

/**
 * Extended bidding -> AuctionRule (EXTENSION_TRIGGER, value = minutes).
 * Only LIVE auctions, and only when the creator turns it on:
 *   LIVE + allowExtendedBidding on -> extensionMinutes (1 - 60, required)
 *   anything else                  -> null (no rule, no extension)
 */
const normalizeExtensionRule = ({ auctionType, allowExtendedBidding, extensionMinutes }) => {
    if (auctionType !== "LIVE") return null;

    const minutes = toNum(extensionMinutes, "Extension duration");
    if (!toBool(allowExtendedBidding, minutes !== null)) return null;

    if (minutes === null) {
        throw httpError("Extension duration is required when extended bidding is on");
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
        throw httpError("Extension duration must be a whole number of minutes between 1 and 60");
    }

    return {
        ruleType: "EXTENSION_TRIGGER",
        valueType: "FIXED",
        value: minutes,
        description: `Bids in the last ${EXTENSION_TRIGGER_WINDOW_MINUTES} minutes extend the auction by ${minutes} minute${minutes === 1 ? "" : "s"}`,
    };
};

const EXTENSION_RULE_INCLUDE = {
    where: { ruleType: "EXTENSION_TRIGGER", isActive: true },
};

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
        currency,          // legacy single currency (still accepted)
        currencies,        // ✅ NEW — allowed list
        primaryCurrency,   // ✅ NEW — primary / settlement
        isOnline,
        venue,
        termsAndConditions,
        categoryUuid,
        subCategoryUuid,
        shippingStrategy,
        visibility,
        allowExtendedBidding,
        extensionMinutes,
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
    const type = pickEnum(auctionType, ENUMS.auctionType, "FLOOR", "auction type");

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

    // ✅ NEW — allowed currencies + primary
    const { codes: currencyCodes, primary: primaryCode } = resolveCurrencies({
        currencies,
        primaryCurrency,
        currency,
    });

    const normalizedTags = normalizeTags(tags);
    const normalizedFees = normalizeFees(fees);
    const extensionRule = normalizeExtensionRule({ auctionType: type, allowExtendedBidding, extensionMinutes });
    const normalizedLots = lots.map((lot, i) => normalizeLot(lot, i, { isDraft }));
    applyLotSchedule(normalizedLots, start, end);

    // ✅ NEW — every lot must use one of the auction's currencies
    normalizedLots.forEach((lot, i) => {
        if (lot.currencyCode && !currencyCodes.includes(lot.currencyCode)) {
            throw httpError(
                `Lot ${i + 1}: currency ${lot.currencyCode} is not allowed for this auction (allowed: ${currencyCodes.join(", ")})`
            );
        }
    });

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

            // ✅ NEW — load every selected currency (must exist + be active in `currencies`)
            const currencyRecords = await tx.currency.findMany({
                where: { code: { in: currencyCodes }, isActive: true },
            });
            const currencyByCode = new Map(currencyRecords.map((c) => [c.code, c]));
            const missing = currencyCodes.filter((code) => !currencyByCode.has(code));
            if (missing.length) {
                throw httpError(`Invalid or inactive currency: ${missing.join(", ")}`);
            }
            const primaryRecord = currencyByCode.get(primaryCode);

            const slug = await uniqueAuctionSlug(tx, toStr(rawSlug) || title);

            const auction = await tx.auction.create({
                data: {
                    title,
                    slug,
                    description: toStr(description),
                    short_description: toStr(short_description),
                    coverImageUrl: toStr(coverImageUrl),
                    auctionType: type,
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
                    // ✅ CHANGED — auctions.currencyId = PRIMARY currency
                    currency: { connect: { id: primaryRecord.id } },
                    category: { connect: { id: category.id } },
                    ...(subCategory && { subCategory: { connect: { id: subCategory.id } } }),
                    creator: { connect: { id: BigInt(createdBy) } },
                },
            });

            // ✅ NEW — every allowed currency, primary flagged
            await tx.auctionCurrency.createMany({
                data: currencyCodes.map((code) => ({
                    auctionId: auction.id,
                    currencyId: currencyByCode.get(code).id,
                    isPrimary: code === primaryCode,
                })),
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

            // ---------------- extended bidding (LIVE + switched on only) ----------------
            if (extensionRule) {
                await tx.auctionRule.create({
                    data: { ...extensionRule, auctionId: auction.id },
                });
            }

            // ---------------- lots ----------------
            for (const lot of normalizedLots) {
                // ✅ CHANGED — pull out currencyCode (not a DB column)
                const { dimension, images, documents, currencyCode, ...itemData } = lot;
                const lotCurrency = currencyByCode.get(currencyCode ?? primaryCode);

                const item = await tx.auctionItem.create({
                    data: {
                        ...itemData,
                        auctionId: auction.id,
                        categoryId: category.id,
                        subCategoryId: subCategory?.id ?? null,
                        currencyId: lotCurrency.id, // ✅ CHANGED — lot's own currency
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
                    // ✅ NEW
                    auctionCurrencies: {
                        include: { currency: true },
                        orderBy: { isPrimary: "desc" },
                    },
                    tags: { include: { tag: true } },
                    auctionFees: { orderBy: { sortOrder: "asc" } },
                    rules: EXTENSION_RULE_INCLUDE,
                    items: {
                        include: {
                            currency: true, // ✅ NEW — lot currency
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
// GET AUCTIONS
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
            // ✅ NEW
            auctionCurrencies: {
                include: { currency: true },
                orderBy: { isPrimary: "desc" },
            },
            category: true,
            subCategory: true,
            creator: { select: { id: true, uuid: true, username: true, email: true } },
            tags: { include: { tag: true } },
            auctionFees: true,
            rules: EXTENSION_RULE_INCLUDE,
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
        select: { id: true, uuid: true, title: true, slug: true, status: true, startTime: true, endTime: true },
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

// =====================================================================
// CHANGE AUCTION STATUS (SUPER_ADMIN)
// =====================================================================

/**
 * Status changes a SUPER_ADMIN may make, by current status.
 * Mirrored in frontend/lib/constants/auctionStatus.ts — keep in sync.
 */
export const AUCTION_STATUS_TRANSITIONS = {
    DRAFT: ["SCHEDULED", "CANCELLED"],
    SCHEDULED: ["DRAFT", "PREVIEW", "LIVE", "CANCELLED"],
    PREVIEW: ["SCHEDULED", "LIVE", "CANCELLED"],
    LIVE: ["PAUSED", "ENDED", "CANCELLED"],
    PAUSED: ["LIVE", "ENDED", "CANCELLED"],
    ENDED: ["SETTLED"],
    SETTLED: [],
    CANCELLED: ["DRAFT"],
};

export const changeAuctionStatusService = async ({ auctionUuid, status, reason, changedBy }) => {
    if (!auctionUuid) throw httpError("Auction UUID is required");
    if (!changedBy) throw httpError("Authenticated user is required", 401);

    return prisma.$transaction(
        async (tx) => {
            const auction = await tx.auction.findUnique({
                where: { uuid: auctionUuid },
                select: {
                    id: true,
                    status: true,
                    publishedAt: true,
                    deletedAt: true,
                    items: { select: { startingPrice: true } },
                },
            });
            if (!auction || auction.deletedAt) throw httpError("Auction not found", 404);

            const from = auction.status;
            if (from === status) throw httpError(`Auction is already ${status}`, 409);

            const allowed = AUCTION_STATUS_TRANSITIONS[from] ?? [];
            if (!allowed.includes(status)) {
                throw httpError(
                    `Cannot change status from ${from} to ${status}` +
                        (allowed.length ? ` (allowed: ${allowed.join(", ")})` : ""),
                    409
                );
            }

            // Publishing a draft needs the same as publishing from the form
            if (from === "DRAFT" && status === "SCHEDULED") {
                if (auction.items.length === 0) {
                    throw httpError("Add at least one lot before publishing the auction");
                }
                if (auction.items.some((item) => !(Number(item.startingPrice) > 0))) {
                    throw httpError("Every lot needs a starting price before publishing");
                }
            }

            // Back to draft clears the publish date; publishing sets it once
            const publishedAt =
                status === "DRAFT"
                    ? null
                    : auction.publishedAt ?? (status === "CANCELLED" ? null : new Date());

            // Only update if nobody changed the status in the meantime
            const { count } = await tx.auction.updateMany({
                where: { id: auction.id, status: from },
                data: { status, publishedAt },
            });
            if (count === 0) {
                throw httpError("The auction status was changed by someone else. Refresh and try again.", 409);
            }

            await tx.auctionStatusHistory.create({
                data: {
                    auctionId: auction.id,
                    fromStatus: from,
                    toStatus: status,
                    changedBy: BigInt(changedBy),
                    reason: toStr(reason) ?? "Status changed by super admin",
                },
            });

            return tx.auction.findUnique({
                where: { id: auction.id },
                select: { uuid: true, title: true, status: true, publishedAt: true, updatedAt: true },
            });
        },
        { maxWait: 10_000, timeout: 30_000 }
    );
};

// =====================================================================
// DELETE AUCTION (DRAFT only)
// =====================================================================

export const deleteAuctionService = async ({ auctionUuid, deletedBy }) => {
    if (!auctionUuid) throw httpError("Auction UUID is required");

    const result = await prisma.$transaction(
        async (tx) => {
            const auction = await tx.auction.findUnique({
                where: { uuid: auctionUuid },
                select: {
                    id: true,
                    uuid: true,
                    title: true,
                    status: true,
                    items: { select: { id: true } },
                },
            });

            if (!auction) throw httpError("Auction not found", 404);

            if (auction.status !== "DRAFT") {
                throw httpError("Only draft auctions can be deleted", 409);
            }

            const itemIds = auction.items.map((item) => item.id);

            if (itemIds.length) {
                await tx.auctionImage.deleteMany({ where: { itemId: { in: itemIds } } });
                await tx.auctionDocument.deleteMany({ where: { itemId: { in: itemIds } } });
                await tx.auctionItemDimension.deleteMany({ where: { auctionItemId: { in: itemIds } } });
            }

            await tx.auctionTagRelation.deleteMany({ where: { auctionId: auction.id } });
            await tx.auctionFee.deleteMany({ where: { auctionId: auction.id } });
            await tx.auctionRule.deleteMany({ where: { auctionId: auction.id } });
            await tx.auctionStatusHistory.deleteMany({ where: { auctionId: auction.id } });
            await tx.auctionCurrency.deleteMany({ where: { auctionId: auction.id } }); // ✅ NEW
            // lot_bidders rows go with the lots (ON DELETE CASCADE)
            await tx.auctionParticipant.deleteMany({ where: { auctionId: auction.id } });

            const { count: deletedLots } = await tx.auctionItem.deleteMany({
                where: { auctionId: auction.id },
            });

            await tx.auction.delete({ where: { id: auction.id } });

            return { uuid: auction.uuid, title: auction.title, deletedLots };
        },
        { maxWait: 10_000, timeout: 30_000 }
    );

    console.info(
        `[auction] deleted draft "${result.title}" (${result.uuid}) with ${result.deletedLots} lot(s) by user ${deletedBy}`
    );

    return result;
};





// =====================================================================
// DELETE ONE LOT (auction DRAFT / SCHEDULED only — same rule as editing)
// Other lots keep their numbers. Registrations on the lot (lot_bidders)
// go with it (ON DELETE CASCADE); the users stay registered for the auction.
// =====================================================================

export const deleteLotService = async ({ lotUuid, deletedBy }) => {
    const result = await prisma.$transaction(
        async (tx) => {
            const lot = await tx.auctionItem.findUnique({
                where: { uuid: lotUuid },
                select: {
                    id: true,
                    uuid: true,
                    itemNumber: true,
                    title: true,
                    auction: { select: { uuid: true, status: true, deletedAt: true } },
                    _count: { select: { bids: true, autoBids: true } },
                    winner: { select: { id: true } },
                },
            });

            if (!lot || lot.auction.deletedAt) throw httpError("Lot not found", 404);
            if (!["DRAFT", "SCHEDULED"].includes(lot.auction.status)) {
                throw httpError(
                    `Lots can only be deleted from draft or scheduled auctions (current status: ${lot.auction.status})`,
                    409
                );
            }
            if (lot._count.bids > 0 || lot._count.autoBids > 0 || lot.winner) {
                throw httpError(`Lot #${lot.itemNumber} already has bids and can't be deleted`, 409);
            }

            await tx.auctionImage.deleteMany({ where: { itemId: lot.id } });
            await tx.auctionDocument.deleteMany({ where: { itemId: lot.id } });
            await tx.auctionExtension.deleteMany({ where: { itemId: lot.id } });
            // dimension + lot_bidders cascade
            await tx.auctionItem.delete({ where: { id: lot.id } });

            return { uuid: lot.uuid, itemNumber: lot.itemNumber, title: lot.title, auctionUuid: lot.auction.uuid };
        },
        { maxWait: 10_000, timeout: 30_000 }
    );

    console.info(`[auction] deleted lot #${result.itemNumber} "${result.title}" (${result.uuid}) by user ${deletedBy}`);

    return serializeBigInt(result);
};

export const updateAuctionService = async (data) => {
    const {
        auctionUuid,
        updatedBy,
        title: rawTitle,
        slug: rawSlug,
        description,
        short_description,
        coverImageUrl,
        removeCoverImage,
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
        currencies,
        primaryCurrency,
        isOnline,
        venue,
        termsAndConditions,
        categoryUuid,
        subCategoryUuid,
        shippingStrategy,
        visibility,
        allowExtendedBidding,
        extensionMinutes,
        tags = [],
        fees = [],
        lots = [],
    } = data;

    // ---------------- validation (same rules as create) ----------------
    if (!auctionUuid) throw httpError("Auction UUID is required");
    if (!updatedBy) throw httpError("Authenticated user is required", 401);
    if (!Array.isArray(tags)) throw httpError("Tags must be an array");
    if (!Array.isArray(fees)) throw httpError("Fees must be an array");
    if (!Array.isArray(lots)) throw httpError("Lots must be an array");

    const title = toStr(rawTitle);
    if (!title) throw httpError("Auction title is required");
    if (!toStr(categoryUuid)) throw httpError("Category is required");

    const auctionStatus = pickEnum(status, ENUMS.auctionStatus, "DRAFT", "auction status");
    const isDraft = auctionStatus === "DRAFT";
    const type = pickEnum(auctionType, ENUMS.auctionType, "FLOOR", "auction type");

    const start = toDate(startTime, "Start time");
    const end = toDate(endTime, "End time");
    if (!start) throw httpError("Auction start date and time are required");
    if (!end) throw httpError("Auction end date and time are required");
    if (end <= start) throw httpError("Auction end time must be after the start time");
    // "Start in the past" is checked inside the transaction, against the saved start

    const regStarts = toDate(registrationStarts, "Registration start");
    const regDeadline = toDate(registrationDeadline, "Registration deadline");
    if (regStarts && regDeadline && regDeadline < regStarts) {
        throw httpError("Registration deadline must be after registration start");
    }

    if (!isDraft && lots.length === 0) {
        throw httpError("Add at least one lot before publishing the auction");
    }

    const { codes: currencyCodes, primary: primaryCode } = resolveCurrencies({
        currencies,
        primaryCurrency,
        currency,
    });

    const normalizedTags = normalizeTags(tags);
    const normalizedFees = normalizeFees(fees);
    const extensionRule = normalizeExtensionRule({ auctionType: type, allowExtendedBidding, extensionMinutes });
    const normalizedLots = lots.map((lot, i) => normalizeLot(lot, i, { isDraft }));
    applyLotSchedule(normalizedLots, start, end);

    normalizedLots.forEach((lot, i) => {
        if (lot.currencyCode && !currencyCodes.includes(lot.currencyCode)) {
            throw httpError(
                `Lot ${i + 1}: currency ${lot.currencyCode} is not allowed for this auction (allowed: ${currencyCodes.join(", ")})`
            );
        }
    });

    const itemNumbers = normalizedLots.map((l) => l.itemNumber);
    if (new Set(itemNumbers).size !== itemNumbers.length) {
        throw httpError("Lot item numbers must be unique");
    }

    // existing lot uuids sent by the client (null = new lot)
    const lotUuids = lots.map((lot) => toStr(lot.uuid));
    const sentUuids = lotUuids.filter(Boolean);
    if (new Set(sentUuids).size !== sentUuids.length) {
        throw httpError("The same lot was sent more than once");
    }

    // ---------------- transaction ----------------
    return prisma.$transaction(
        async (tx) => {
            const existing = await tx.auction.findUnique({
                where: { uuid: auctionUuid },
                select: {
                    id: true,
                    slug: true,
                    status: true,
                    startTime: true,
                    publishedAt: true,
                    deletedAt: true,
                    coverImageUrl: true,
                    items: {
                        select: {
                            id: true,
                            uuid: true,
                            images: {
                                select: { url: true, thumbnailUrl: true, caption: true, isPrimary: true, mediaType: true },
                                orderBy: { sortOrder: "asc" },
                            },
                            documents: {
                                select: {
                                    documentType: true,
                                    fileUrl: true,
                                    fileName: true,
                                    mimeType: true,
                                    fileSize: true,
                                    description: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!existing || existing.deletedAt) throw httpError("Auction not found", 404);
            if (!["DRAFT", "SCHEDULED"].includes(existing.status)) {
                throw httpError(
                    `Only draft or scheduled auctions can be edited (current status: ${existing.status})`,
                    409
                );
            }

            // Publishing a draft, or moving the start, can't put it in the past (1 min grace).
            // Re-saving a scheduled auction whose start is unchanged is fine — e.g. to
            // edit lots after the start time has passed.
            const publishing = existing.status === "DRAFT";
            const startMoved = existing.startTime.getTime() !== start.getTime();
            if (!isDraft && (publishing || startMoved) && start.getTime() < Date.now() - 60_000) {
                throw httpError("Auction start time cannot be in the past");
            }

            // every lot uuid sent must belong to THIS auction
            const itemByUuid = new Map(existing.items.map((item) => [item.uuid, item]));
            lotUuids.forEach((uuid, i) => {
                if (uuid && !itemByUuid.has(uuid)) {
                    throw httpError(`Lot ${i + 1} does not belong to this auction`);
                }
            });

            // ---- category ----
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

            // ---- currencies ----
            const currencyRecords = await tx.currency.findMany({
                where: { code: { in: currencyCodes }, isActive: true },
            });
            const currencyByCode = new Map(currencyRecords.map((c) => [c.code, c]));
            const missing = currencyCodes.filter((code) => !currencyByCode.has(code));
            if (missing.length) throw httpError(`Invalid or inactive currency: ${missing.join(", ")}`);
            const primaryRecord = currencyByCode.get(primaryCode);

            // ---- slug: keep current unless a different one is asked for ----
            let slug = existing.slug;
            if (toStr(rawSlug) && slugify(rawSlug) !== existing.slug) {
                slug = await uniqueAuctionSlug(tx, rawSlug);
            }

            // ---- cover: new upload > remove flag > keep current ----
            let cover = existing.coverImageUrl;
            if (toStr(coverImageUrl)) cover = toStr(coverImageUrl);
            else if (toBool(removeCoverImage, false)) cover = null;

            // ---------------- auction ----------------
            await tx.auction.update({
                where: { id: existing.id },
                data: {
                    title,
                    slug,
                    description: toStr(description),
                    short_description: toStr(short_description),
                    coverImageUrl: cover,
                    auctionType: type,
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
                    // keep the first publish date; moving back to draft clears it
                    publishedAt: isDraft ? null : existing.publishedAt ?? new Date(),
                    shippingStrategy: pickEnum(
                        shippingStrategy,
                        ENUMS.shippingStrategy,
                        "SHIPPING_CALCULATED_SEPARATELY",
                        "shipping strategy"
                    ),
                    visibility: pickEnum(visibility, ENUMS.visibility, "REGISTERED_USERS_ONLY", "visibility"),
                    currency: { connect: { id: primaryRecord.id } },
                    category: { connect: { id: category.id } },
                    subCategory: subCategory ? { connect: { id: subCategory.id } } : { disconnect: true },
                },
            });

            if (existing.status !== auctionStatus) {
                await tx.auctionStatusHistory.create({
                    data: {
                        auctionId: existing.id,
                        fromStatus: existing.status,
                        toStatus: auctionStatus,
                        changedBy: BigInt(updatedBy),
                        reason: isDraft ? "Moved back to draft" : "Auction published",
                    },
                });
            }

            // ---------------- currencies: replace ----------------
            await tx.auctionCurrency.deleteMany({ where: { auctionId: existing.id } });
            await tx.auctionCurrency.createMany({
                data: currencyCodes.map((code) => ({
                    auctionId: existing.id,
                    currencyId: currencyByCode.get(code).id,
                    isPrimary: code === primaryCode,
                })),
            });

            // ---------------- tags: replace ----------------
            await tx.auctionTagRelation.deleteMany({ where: { auctionId: existing.id } });
            for (const { slug: tagSlug, name } of normalizedTags) {
                const tag = await tx.auctionTag.upsert({
                    where: { slug: tagSlug },
                    update: {},
                    create: { name, slug: tagSlug },
                });
                if (!tag.isActive) throw httpError(`Tag "${name}" is disabled`);
                await tx.auctionTagRelation.create({ data: { auctionId: existing.id, tagId: tag.id } });
            }

            // ---------------- fees: replace ----------------
            await tx.auctionFee.deleteMany({ where: { auctionId: existing.id } });
            if (normalizedFees.length > 0) {
                await tx.auctionFee.createMany({
                    data: normalizedFees.map((fee) => ({ ...fee, auctionId: existing.id })),
                });
            }

            // ---------------- extended bidding: replace (or clear) ----------------
            await tx.auctionRule.deleteMany({
                where: { auctionId: existing.id, ruleType: "EXTENSION_TRIGGER" },
            });
            if (extensionRule) {
                await tx.auctionRule.create({
                    data: { ...extensionRule, auctionId: existing.id },
                });
            }

            // ---------------- lots: delete removed ----------------
            const keptUuids = new Set(sentUuids);
            const removedIds = existing.items
                .filter((item) => !keptUuids.has(item.uuid))
                .map((item) => item.id);

            if (removedIds.length) {
                await tx.auctionImage.deleteMany({ where: { itemId: { in: removedIds } } });
                await tx.auctionDocument.deleteMany({ where: { itemId: { in: removedIds } } });
                await tx.auctionItemDimension.deleteMany({ where: { auctionItemId: { in: removedIds } } });
                await tx.auctionItem.deleteMany({ where: { id: { in: removedIds } } });
            }

            // Park kept lots on temporary numbers so re-ordering
            // (e.g. swapping lot 1 and 2) can't clash on itemNumber
            let temp = -1;
            for (const uuid of keptUuids) {
                await tx.auctionItem.update({
                    where: { id: itemByUuid.get(uuid).id },
                    data: { itemNumber: temp-- },
                });
            }

            // ---------------- lots: create / update ----------------
            for (let i = 0; i < normalizedLots.length; i++) {
                const raw = lots[i];
                const uuid = lotUuids[i];
                const { dimension, images, documents, currencyCode, ...itemData } = normalizedLots[i];

                const lotData = {
                    ...itemData,
                    categoryId: category.id,
                    subCategoryId: subCategory?.id ?? null,
                    currencyId: currencyByCode.get(currencyCode ?? primaryCode).id,
                };

                // new uploads: use the client's isPrimary (normalizeLot forces one on its own)
                const newImages = images.map((img, j) => ({
                    ...img,
                    isPrimary: Boolean(raw.images?.[j]?.isPrimary),
                }));

                let itemId;
                let allImages;
                let allDocs;

                if (!uuid) {
                    // ---- NEW lot ----
                    const item = await tx.auctionItem.create({
                        data: {
                            ...lotData,
                            auctionId: existing.id,
                            ...(dimension && { dimension: { create: dimension } }),
                        },
                    });
                    itemId = item.id;
                    allImages = newImages;
                    allDocs = documents;
                } else {
                    // ---- EXISTING lot ----
                    const current = itemByUuid.get(uuid);
                    itemId = current.id;

                    await tx.auctionItem.update({ where: { id: itemId }, data: lotData });

                    // dimension: replace
                    await tx.auctionItemDimension.deleteMany({ where: { auctionItemId: itemId } });
                    if (dimension) {
                        await tx.auctionItemDimension.create({ data: { ...dimension, auctionItemId: itemId } });
                    }

                    // kept images — only URLs this lot already owns
                    const oldImageByUrl = new Map(current.images.map((img) => [img.url, img]));
                    const keptImages = Array.isArray(raw.keepMedia)
                        ? raw.keepMedia
                            .filter((m) => m && oldImageByUrl.has(m.url))
                            .map((m) => ({
                                ...oldImageByUrl.get(m.url),
                                caption: toStr(m.caption),
                                isPrimary: Boolean(m.isPrimary),
                            }))
                        : current.images;

                    // kept documents — only URLs this lot already owns
                    const oldDocByUrl = new Map(current.documents.map((doc) => [doc.fileUrl, doc]));
                    const keptDocs = Array.isArray(raw.keepDocuments)
                        ? raw.keepDocuments
                            .filter((d) => d && oldDocByUrl.has(d.fileUrl))
                            .map((d) => {
                                const old = oldDocByUrl.get(d.fileUrl);
                                return {
                                    ...old,
                                    documentType: pickEnum(
                                        d.documentType,
                                        ENUMS.documentType,
                                        old.documentType,
                                        "document type"
                                    ),
                                    description: toStr(d.description),
                                };
                            })
                        : current.documents;

                    await tx.auctionImage.deleteMany({ where: { itemId } });
                    await tx.auctionDocument.deleteMany({ where: { itemId } });

                    allImages = [...keptImages, ...newImages];
                    allDocs = [...keptDocs, ...documents];
                }

                // exactly one primary IMAGE, sortOrder = array order
                const primaryIdx = allImages.findIndex((img) => img.isPrimary && img.mediaType === "IMAGE");
                const chosen =
                    primaryIdx !== -1 ? primaryIdx : allImages.findIndex((img) => img.mediaType === "IMAGE");

                if (allImages.length > 0) {
                    await tx.auctionImage.createMany({
                        data: allImages.map((img, j) => ({
                            ...img,
                            sortOrder: j,
                            isPrimary: j === chosen,
                            itemId,
                        })),
                    });
                }

                if (allDocs.length > 0) {
                    await tx.auctionDocument.createMany({
                        data: allDocs.map((doc) => ({ ...doc, itemId })),
                    });
                }
            }

            // ---------------- registrations: users already registered for the auction get the new lots ----------------
            await syncParticipantsToLots(tx, existing.id);

            return tx.auction.findUnique({
                where: { id: existing.id },
                include: {
                    category: true,
                    subCategory: true,
                    currency: true,
                    auctionCurrencies: {
                        include: { currency: true },
                        orderBy: { isPrimary: "desc" },
                    },
                    tags: { include: { tag: true } },
                    auctionFees: { orderBy: { sortOrder: "asc" } },
                    rules: EXTENSION_RULE_INCLUDE,
                    items: {
                        include: {
                            currency: true,
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