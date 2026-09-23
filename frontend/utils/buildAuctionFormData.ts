import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import type { AuctionStatus } from "@/lib/types/auction.types";

// ============================================================
// HELPERS
// ============================================================

/** RHF `valueAsNumber` gives NaN for empty inputs — turn that into null. */
const num = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
};

const str = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s === "" ? null : s;
};

/**
 * Accepts "14:30", "14:30:00", "2:30 PM", "02:30 pm".
 * Returns "HH:mm" (24h) or null.
 */
const normalizeTime = (time: string): string | null => {
    const t = time?.trim();
    if (!t) return null;

    const match = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = match[2];
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    if (hours > 23) return null;

    return `${String(hours).padStart(2, "0")}:${minutes}`;
};

/**
 * "2026-10-12" + "10:00" (in the admin's local timezone) -> ISO UTC string.
 * Returns "" if either part is missing so the backend can report it.
 */
const combineDateTime = (date: string, time: string): string => {
    const hhmm = normalizeTime(time);
    if (!date || !hhmm) return "";
    const d = new Date(`${date}T${hhmm}:00`);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

/** "2026-10-12" -> local midnight as ISO (avoids UTC off-by-one in IST). */
const dateOnlyToIso = (date: string): string => {
    if (!date) return "";
    const d = new Date(`${date}T00:00:00`);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

const DIMENSION_UNIT_MAP: Record<string, string> = {
    cm: "CM",
    mm: "MM",
    m: "METER",
    meter: "METER",
    in: "INCH",
    inch: "INCH",
    ft: "FEET",
    feet: "FEET",
};

const toDimensionUnit = (unit: string | undefined): string => {
    if (!unit) return "CM";
    return DIMENSION_UNIT_MAP[unit.toLowerCase()] ?? unit.toUpperCase();
};

const appendIfPresent = (formData: FormData, key: string, value: unknown) => {
    const s = str(value);
    if (s !== null) formData.append(key, s);
};

// ============================================================
// BUILD AUCTION FORM DATA
// ============================================================

export const buildAuctionFormData = (
    data: AuctionFormData,
    status: Extract<AuctionStatus, "DRAFT" | "SCHEDULED"> = "DRAFT"
): FormData => {
    const formData = new FormData();
    const { basicInfo, schedule, lots, fees, shipping, visibility } = data;

    // ========================================================
    // BASIC INFORMATION
    // ========================================================

    formData.append("status", status);
    formData.append("title", basicInfo.auctionName.trim());

    // Backend guarantees uniqueness (appends -2, -3 ...). Prefer the
    // admin's reference if they typed one, otherwise the title.
    formData.append("slug", str(basicInfo.auctionId) ?? basicInfo.auctionName);

    appendIfPresent(formData, "description", basicInfo.description);
    appendIfPresent(formData, "short_description", basicInfo.shortDescription);
    formData.append("auctionType", basicInfo.auctionType || "FLOOR");
    formData.append("categoryUuid", basicInfo.categoryUuid);
    appendIfPresent(formData, "subCategoryUuid", basicInfo.subCategoryUuid);

    // Auction model stores ONE currency — send the first selected as a plain string
    formData.append("currency", basicInfo.currency?.[0] ?? "INR");

    if (basicInfo.coverImage instanceof File) {
        formData.append("coverImage", basicInfo.coverImage);
    }

    formData.append("tags", JSON.stringify(basicInfo.auctionTags ?? []));

    // ========================================================
    // SCHEDULE
    // ========================================================

    formData.append("startTime", combineDateTime(schedule.startDate, schedule.startTime));
    formData.append("endTime", combineDateTime(schedule.endDate, schedule.endTime));
    appendIfPresent(formData, "startDate", dateOnlyToIso(schedule.startDate));
    appendIfPresent(formData, "endDate", dateOnlyToIso(schedule.endDate));
    appendIfPresent(formData, "previewStartAt", dateOnlyToIso(schedule.previewStartAt));

    formData.append("registrationRequired", String(Boolean(schedule.registrationRequired)));
    appendIfPresent(formData, "registrationStarts", dateOnlyToIso(schedule.registrationStarts));
    appendIfPresent(formData, "registrationDeadline", dateOnlyToIso(schedule.registrationDeadline));
    formData.append("timezone", schedule.timezone || "Asia/Kolkata");

    // ========================================================
    // SHIPPING + VENUE
    // ========================================================

    formData.append("shippingStrategy", shipping.shippingStrategy);
    formData.append("isOnline", String(Boolean(shipping.isOnline)));
    appendIfPresent(formData, "venue", shipping.venue || basicInfo.auctionLocation);

    // ========================================================
    // VISIBILITY
    // ========================================================

    formData.append("visibility", visibility.visibility);
    appendIfPresent(formData, "termsAndConditions", visibility.termsAndConditions);

    // ========================================================
    // FEES
    // ========================================================

    formData.append(
        "fees",
        JSON.stringify(
            (fees ?? []).map((fee, index) => ({
                feeType: fee.feeType,
                name: fee.name,
                calculationType: fee.calculationType,
                value: num(fee.value) ?? 0,
                description: str(fee.description),
                isActive: fee.isActive ?? true,
                sortOrder: fee.sortOrder ?? index,
            }))
        )
    );

    // ========================================================
    // LOTS (JSON) — files are appended separately below
    // ========================================================

    const lotsPayload = lots.map((lot, index) => {
        const { details, pricing, condition, provenance, authentication } = lot;

        const width = num(details.dimensions?.width);
        const height = num(details.dimensions?.height);
        const depth = num(details.dimensions?.depth);
        const weight = num(details.weight);
        const hasDimension = [width, height, depth, weight].some((v) => v !== null);

        const provenanceSummary =
            [
                str(provenance.previousOwner) && `Previous owner: ${provenance.previousOwner}`,
                str(provenance.acquisitionMethod) && `Acquired via: ${provenance.acquisitionMethod}`,
                str(provenance.acquisitionDate) && `Acquired on: ${provenance.acquisitionDate}`,
            ]
                .filter(Boolean)
                .join(" | ") || null;

        const media = (lot.images ?? []).filter((m) => m?.file instanceof File);
        const docs = (lot.documents ?? []).filter((d) => d?.file instanceof File);

        return {
            itemNumber: index + 1,
            title: details.title,
            description: str(details.description),
            artistName: str(details.artist),
            medium: str(details.medium),
            yearCreated: str(details.yearCreated),

            dimension: hasDimension
                ? {
                    width,
                    height,
                    depth,
                    dimensionUnit: toDimensionUnit(details.dimensions?.unit),
                    weight,
                    weightUnit: weight !== null ? "KG" : null,
                }
                : null,

            provenance: provenanceSummary,
            previousOwner: str(provenance.previousOwner),
            acquisitionMethod: str(provenance.acquisitionMethod),
            acquisitionDate: str(provenance.acquisitionDate), // stays "YYYY-MM-DD" (String column)
            exhibitionHistory: str(provenance.exhibitionHistory),

            conditionReport: str(condition.detailedConditionNotes),
            overallCondition: str(condition.overallCondition),
            frameCondition: str(condition.frameCondition),
            detailedConditionNotes: str(condition.detailedConditionNotes),
            restorationHistory: str(condition.restorationHistory),

            authenticateBy: str(authentication.authenticatedBy),
            auctheticateDate: dateOnlyToIso(authentication.authenticatedDate) || null,

            editionType: details.editionType || "UNIQUE",

            startingPrice: num(pricing.startingPrice),
            reservePrice: num(pricing.reservePrice),
            estimateLow: num(pricing.estimateFrom),
            estimateHigh: num(pricing.estimateTo),
            insureanceValue: num(pricing.insuranceDeclaredValue),
            gstRate: num(pricing.gstRate),
            hsnCode: str(pricing.hsnCode), // backend strips spaces/dots

            status: lot.status || "DRAFT",
            shippingInfo: str(lot.shippingInfo) ?? str(shipping.shippingInfo),
            isFeatured: Boolean(lot.isFeatured),

            // Index-aligned with the files appended under lotMedia_{i} / lotDocuments_{i}
            mediaMeta: media.map((m) => ({ isPrimary: Boolean(m.isPrimary) })),
            documentMeta: docs.map((d) => ({
                documentType: d.documentType || "OTHER",
                description: str(d.description),
            })),
        };
    });

    formData.append("lots", JSON.stringify(lotsPayload));

    // ========================================================
    // LOT FILES
    // ========================================================

    lots.forEach((lot, lotIndex) => {
        // Images + videos together, preserving the order the admin arranged
        (lot.images ?? []).forEach((media) => {
            if (media?.file instanceof File) {
                formData.append(`lotMedia_${lotIndex}`, media.file);
            }
        });

        (lot.documents ?? []).forEach((document) => {
            if (document?.file instanceof File) {
                formData.append(`lotDocuments_${lotIndex}`, document.file);
            }
        });
    });

    return formData;
};

// ============================================================
// CLIENT-SIDE VALIDATION (runs before the request)
// Returns a list of human-readable problems; empty = OK.
// ============================================================

export const validateAuctionForm = (
    data: AuctionFormData,
    status: "DRAFT" | "SCHEDULED"
): string[] => {
    const errors: string[] = [];
    const { basicInfo, schedule, lots } = data;

    if (!basicInfo.auctionName?.trim()) errors.push("Auction name is required");
    if (!basicInfo.categoryUuid) errors.push("Category is required");
    if (!basicInfo.currency?.length) errors.push("Select at least one currency");

    const start = combineDateTime(schedule.startDate, schedule.startTime);
    const end = combineDateTime(schedule.endDate, schedule.endTime);
    if (!start) errors.push("Auction start date and time are required");
    if (!end) errors.push("Auction end date and time are required");
    if (start && end && new Date(end) <= new Date(start)) {
        errors.push("Auction end must be after the start");
    }
    if (status === "SCHEDULED" && start && new Date(start).getTime() < Date.now()) {
        errors.push("Auction start cannot be in the past");
    }

    const regStart = schedule.registrationStarts;
    const regEnd = schedule.registrationDeadline;
    if (regStart && regEnd && regEnd < regStart) {
        errors.push("Registration deadline must be after registration start");
    }
    if (regEnd && schedule.startDate && regEnd > schedule.startDate) {
        errors.push("Registration deadline should be on or before the auction start date");
    }

    if (!data.shipping.isOnline && !data.shipping.venue?.trim()) {
        errors.push("Venue is required for an offline auction");
    }

    if (status === "SCHEDULED" && lots.length === 0) {
        errors.push("Add at least one lot before publishing");
    }

    lots.forEach((lot, i) => {
        const n = i + 1;
        if (!lot.details.title?.trim()) errors.push(`Lot ${n}: title is required`);

        const starting = num(lot.pricing.startingPrice);
        if (status === "SCHEDULED" && (starting === null || starting <= 0)) {
            errors.push(`Lot ${n}: starting price is required`);
        }

        const hasImage = (lot.images ?? []).some((m) => m?.file?.type?.startsWith("image/"));
        if (status === "SCHEDULED" && !hasImage) {
            errors.push(`Lot ${n}: add at least one image`);
        }

        const low = num(lot.pricing.estimateFrom);
        const high = num(lot.pricing.estimateTo);
        if (low !== null && high !== null && low > high) {
            errors.push(`Lot ${n}: estimate low cannot exceed estimate high`);
        }
    });

    return errors;
};