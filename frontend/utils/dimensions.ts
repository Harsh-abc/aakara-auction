import type { DimensionUnit } from "@/lib/types/auction.types";

// ============================================================
// A lot's size is kept in two units, each set with its own unit
// (AuctionItemDimension: width… + dimensionUnit, secondaryWidth… + secondaryDimensionUnit)
// ============================================================

export const DIMENSION_SIDES = ["width", "height", "depth"] as const;

export const DIMENSION_UNITS: { value: DimensionUnit; label: string }[] = [
    { value: "CM", label: "cm" },
    { value: "MM", label: "mm" },
    { value: "INCH", label: "inch" },
    { value: "METER", label: "m" },
    { value: "FEET", label: "ft" },
];

const SHORT_LABELS: Record<DimensionUnit, string> = { CM: "cm", MM: "mm", INCH: "in", METER: "m", FEET: "ft" };

const CM_PER_UNIT: Record<DimensionUnit, number> = { CM: 1, MM: 0.1, INCH: 2.54, METER: 100, FEET: 30.48 };

/** 2 decimals, the precision the columns keep */
export const convertMeasure = (value: number, from: DimensionUnit, to: DimensionUnit) =>
    Math.round(((value * CM_PER_UNIT[from]) / CM_PER_UNIT[to]) * 100) / 100;

type Measure = number | string | null | undefined;

/** One unit's width / height / depth */
export interface SizeSet {
    width: Measure;
    height: Measure;
    depth: Measure;
    unit: DimensionUnit;
}

/** The size as the API returns it */
export interface StoredLotSize {
    width: Measure;
    height: Measure;
    depth: Measure;
    dimensionUnit: DimensionUnit;
    secondaryWidth: Measure;
    secondaryHeight: Measure;
    secondaryDepth: Measure;
    secondaryDimensionUnit: DimensionUnit;
}

const positive = (value: Measure): number | null => {
    const n = Number(value);
    return value !== null && value !== undefined && value !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

/** "122 × 91 × 3 cm" — height first, the catalogue convention */
const formatSet = (set: SizeSet | null | undefined) => {
    if (!set) return null;
    const sizes = [set.height, set.width, set.depth].map(positive).filter((n): n is number => n !== null);
    return sizes.length ? `${sizes.join(" × ")} ${SHORT_LABELS[set.unit] ?? set.unit.toLowerCase()}` : null;
};

/** "122 × 91 × 3 cm (48 × 35.83 × 1.18 in)" */
export const formatSizeSets = (primary: SizeSet | null | undefined, secondary: SizeSet | null | undefined) => {
    const first = formatSet(primary);
    const second = primary?.unit === secondary?.unit ? null : formatSet(secondary);
    return first && second ? `${first} (${second})` : first ?? second;
};

export const formatLotSize = (size: StoredLotSize | null | undefined) =>
    size
        ? formatSizeSets(
              { width: size.width, height: size.height, depth: size.depth, unit: size.dimensionUnit },
              {
                  width: size.secondaryWidth,
                  height: size.secondaryHeight,
                  depth: size.secondaryDepth,
                  unit: size.secondaryDimensionUnit,
              }
          )
        : null;
