// ============================================================
// Lot sizes are kept in both cm and inches (AuctionItemDimension)
// ============================================================

export const CM_PER_INCH = 2.54;

export const DIMENSION_SIDES = ["width", "height", "depth"] as const;
export type DimensionSide = (typeof DIMENSION_SIDES)[number];

type Measure = number | string | null | undefined;

/** A size in both units — the API's decimal strings or the form's numbers */
export type LotSize = Partial<Record<`${DimensionSide}${"Cm" | "In"}`, Measure>>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export const cmToInch = (cm: number) => round2(cm / CM_PER_INCH);
export const inchToCm = (inch: number) => round2(inch * CM_PER_INCH);

const positive = (value: Measure): number | null => {
    const n = Number(value);
    return value !== null && value !== undefined && value !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

const formatSet = (values: Measure[], unit: string) => {
    const sizes = values.map(positive).filter((n): n is number => n !== null);
    return sizes.length ? `${sizes.join(" × ")} ${unit}` : null;
};

/** "122 × 91 × 3 cm (48 × 35.83 × 1.18 in)" — height first, the catalogue convention */
export const formatLotSize = (size: LotSize | null | undefined): string | null => {
    if (!size) return null;
    const cm = formatSet([size.heightCm, size.widthCm, size.depthCm], "cm");
    const inch = formatSet([size.heightIn, size.widthIn, size.depthIn], "in");
    return cm && inch ? `${cm} (${inch})` : cm ?? inch;
};
