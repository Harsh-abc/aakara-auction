"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { Lock } from "lucide-react";
import { useAppSelector } from "@/hooks/redux";

import DashboardFormText from "@/components/common/DashboardFormText";
import RichTextEditor from "@/components/common/RichTextEditor/RichTextEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import { getCategories, getSubCategories } from "@/services/operations/category.api";
import { uploadEditorImage } from "@/services/operations/upload.api";
import type { Category, SubCategory } from "@/lib/types/category.types";
import type { DimensionUnit } from "@/lib/types/auction.types";
import { convertMeasure, DIMENSION_SIDES, DIMENSION_UNITS } from "@/utils/dimensions";

import LotSchedule from "./LotSchedule";

interface LotsDetailProps {
    lotIndex: number;
}



export function useAuctionCategoryName(categoryUuid?: string, subCategoryUuid?: string) {
    const [categoryName, setCategoryName] = useState<string | null>(null);
    const [subCategoryName, setSubCategoryName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        if (!categoryUuid) {
            setCategoryName(null);
            setSubCategoryName(null);
            return;
        }

        const load = async () => {
            setLoading(true);
            try {
                const [catRes, subRes] = await Promise.all([
                    getCategories(),
                    subCategoryUuid ? getSubCategories(categoryUuid) : Promise.resolve(null),
                ]);

                if (cancelled) return;

                const category = catRes?.success
                    ? (catRes.data as Category[]).find((c) => c.uuid === categoryUuid)
                    : undefined;
                const subCategory = subRes?.success
                    ? (subRes.data as SubCategory[]).find((s) => s.uuid === subCategoryUuid)
                    : undefined;

                setCategoryName(category?.name ?? null);
                setSubCategoryName(subCategory?.name ?? null);
            } catch (error) {
                console.error("Failed to load auction category:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [categoryUuid, subCategoryUuid]);

    return { categoryName, subCategoryName, loading };
}



const isMeasure = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

// One size set: height / width / depth and its unit. A value typed here fills
// the same side of the other set (in that set's unit) while that side is empty
// or still holds the converted value — once it's typed by hand it's left alone.
function SizeRow({ lotIndex, set }: { lotIndex: number; set: "primary" | "secondary" }) {
    const { register, control, getValues, setValue } = useFormContext<AuctionFormData>();

    const base = `lots.${lotIndex}.details.dimensions.${set}` as const;
    const otherBase = `lots.${lotIndex}.details.dimensions.${set === "primary" ? "secondary" : "primary"}` as const;
    const unitLabel = useWatch({ control, name: `${base}.unit` });
    const label = DIMENSION_UNITS.find((u) => u.value === unitLabel)?.label ?? "";

    // a new unit for this set: re-convert whichever side was the converted one
    const changeUnit = (from: DimensionUnit, to: DimensionUnit) => {
        const otherUnit = getValues(`${otherBase}.unit`);
        for (const side of DIMENSION_SIDES) {
            const mine = getValues(`${base}.${side}`);
            const other = getValues(`${otherBase}.${side}`);
            if (isMeasure(other) && (!isMeasure(mine) || mine === convertMeasure(other, otherUnit, from))) {
                setValue(`${base}.${side}`, convertMeasure(other, otherUnit, to), { shouldDirty: true });
            } else if (isMeasure(mine) && (!isMeasure(other) || other === convertMeasure(mine, from, otherUnit))) {
                setValue(`${otherBase}.${side}`, convertMeasure(mine, to, otherUnit), { shouldDirty: true });
            }
        }
    };

    return (
        <div className="grid grid-cols-4 gap-4">
            {DIMENSION_SIDES.map((side) => {
                const path = `${base}.${side}` as const;
                const otherPath = `${otherBase}.${side}` as const;

                return (
                    <div key={side} className="input-wrapper">
                        <label className="block mb-2 capitalize">{label ? `${side} (${label})` : side}</label>
                        <Input
                            type="number"
                            step="any"
                            min={0}
                            className="w-full border rounded-md px-3 py-2 h-11"
                            // the value before each keystroke rides on the input itself
                            onFocus={(e) => {
                                e.currentTarget.dataset.previous = String(getValues(path) ?? "");
                            }}
                            {...register(path, {
                                valueAsNumber: true,
                                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const unit = getValues(`${base}.unit`);
                                    const otherUnit = getValues(`${otherBase}.unit`);
                                    const before = Number(e.target.dataset.previous || NaN);
                                    const value = getValues(path);
                                    const other = getValues(otherPath);
                                    if (!isMeasure(other) || (isMeasure(before) && other === convertMeasure(before, unit, otherUnit))) {
                                        setValue(otherPath, isMeasure(value) ? convertMeasure(value, unit, otherUnit) : null, {
                                            shouldDirty: true,
                                        });
                                    }
                                    e.target.dataset.previous = String(value ?? "");
                                },
                            })}
                        />
                    </div>
                );
            })}

            <div className="input-wrapper">
                <label className="block mb-2">Unit</label>
                <Controller
                    name={`${base}.unit`}
                    control={control}
                    render={({ field }) => (
                        <select
                            value={field.value}
                            onChange={(e) => {
                                const next = e.target.value as DimensionUnit;
                                changeUnit(field.value, next);
                                field.onChange(next);
                            }}
                            onBlur={field.onBlur}
                            className="w-full border rounded-md px-3 py-2 h-11"
                        >
                            {DIMENSION_UNITS.map((u) => (
                                <option key={u.value} value={u.value}>
                                    {u.label}
                                </option>
                            ))}
                        </select>
                    )}
                />
            </div>
        </div>
    );
}

export default function LotsDetail({ lotIndex }: LotsDetailProps) {
    const { register, control, setValue, getValues } = useFormContext<AuctionFormData>();

    const token = useAppSelector((state) => state.auth.accessToken);

    // images inside the artwork description go straight to S3; the HTML keeps their URLs
    const handleDescriptionImageUpload = useCallback((file: File) => uploadEditorImage(file, token), [token]);

    const auctionCategoryUuid = useWatch({ control, name: "basicInfo.categoryUuid" });
    const auctionSubCategoryUuid = useWatch({ control, name: "basicInfo.subCategoryUuid" });

    const { categoryName, subCategoryName, loading: categoryLoading } = useAuctionCategoryName(
        auctionCategoryUuid,
        auctionSubCategoryUuid
    );

    useEffect(() => {
        const path = `lots.${lotIndex}.details.categoryUuid` as const;
        if (getValues(path) !== (auctionCategoryUuid ?? "")) {
            setValue(path, auctionCategoryUuid ?? "", { shouldDirty: true });
        }
    }, [auctionCategoryUuid, lotIndex, getValues, setValue]);

    const categoryLabel = !auctionCategoryUuid
        ? ""
        : categoryLoading
            ? "Loading..."
            : categoryName
                ? subCategoryName
                    ? `${categoryName} / ${subCategoryName}`
                    : categoryName
                : "Unknown category";

    return (
        <div className="px-6 pb-5 mb-20">

            <DashboardFormText text="Primary Artwork Information" />

            <div className="grid grid-cols-2 gap-4">
                <div className="input-wrapper">
                    <label className="block mb-2">Lot Title</label>
                    <Input
                        type="text"
                        placeholder="e.g. Harbour at Dusk"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(`lots.${lotIndex}.details.title`)}
                    />
                </div>

                <div className="input-wrapper">
                    <label className="block mb-2">Artist Name</label>
                    <Input
                        type="text"
                        placeholder="Enter Artist"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(`lots.${lotIndex}.details.artist`)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="input-wrapper">
                    <label className="block mb-2">Artwork ID</label>
                    <Input
                        type="text"
                        placeholder="e.g. ART-00117"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(`lots.${lotIndex}.details.artworkId`)}
                    />
                </div>

                {/* Category — inherited from the auction, read-only */}
                <div className="input-wrapper">
                    <label className="block mb-2">Category</label>

                    <div className="relative">
                        <Input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={categoryLabel}
                            placeholder="Select a category in Basic Info"
                            className="w-full border rounded-md px-3 py-2 h-11 pr-9 bg-slate-50 text-slate-600 cursor-not-allowed"
                        />
                        <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    <p className={`mt-1 text-xs ${auctionCategoryUuid ? "text-slate-500" : "text-amber-600"}`}>
                        {auctionCategoryUuid
                            ? "Inherited from the auction (Step 1: Basic Info)."
                            : "No category selected yet. Choose one in Step 1: Basic Info."}
                    </p>

                    {/* keeps the value registered in the form */}
                    <input type="hidden" {...register(`lots.${lotIndex}.details.categoryUuid`)} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="input-wrapper">
                    <label className="block mb-2">Medium</label>
                    <Input
                        type="text"
                        placeholder="eg. Oil on Canvas, Bronze Sculpture"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(`lots.${lotIndex}.details.medium`)}
                    />
                </div>

                <div className="input-wrapper">
                    <label className="block mb-2">Year of creation</label>
                    <Input
                        type="text"
                        placeholder="YYYY"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(`lots.${lotIndex}.details.yearCreated`)}
                    />
                </div>
            </div>

            {/* =========================
                SCHEDULE (inside the auction window)
            ========================== */}

            <LotSchedule lotIndex={lotIndex} />

            {/* =========================
                MEASUREMENTS
            ========================== */}

            <div className="px-6 bg-[#f4f2f2] py-6 my-6 rounded-[8px]">
                <h1 className="text-[16px] font-bold">Artwork Measurement</h1>

                <p className="mt-1 text-xs text-slate-500">
                    Enter the size in either row — the other row is converted into its unit for you, and can be changed by hand.
                </p>

                <SizeRow lotIndex={lotIndex} set="primary" />
                <SizeRow lotIndex={lotIndex} set="secondary" />

                <div className="grid grid-cols-3 gap-4">
                    <div className="input-wrapper">
                        <label className="block mb-2">Weight (in Kg)</label>
                        <Input
                            type="number"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.details.weight`, { valueAsNumber: true })}
                        />
                    </div>
                </div>
            </div>

            {/* =========================
                EDITION TYPE
            ========================== */}

            <div>
                <h6 className="text-[13px] font-semibold">Edition Type</h6>

                <Controller
                    name={`lots.${lotIndex}.details.editionType`}
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="w-fit flex items-center mt-4"
                        >
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="UNIQUE" id={`unique-${lotIndex}`} />
                                <Label htmlFor={`unique-${lotIndex}`}>Unique / Original</Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="LIMITED" id={`limited-${lotIndex}`} />
                                <Label htmlFor={`limited-${lotIndex}`}>Limited Edition</Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="OPEN" id={`open-${lotIndex}`} />
                                <Label htmlFor={`open-${lotIndex}`}>Open Edition</Label>
                            </div>
                        </RadioGroup>
                    )}
                />
            </div>

            {/* =========================
                DESCRIPTION
            ========================== */}

            <div className="mt-6">
                <label className="block mb-2">Artwork Description</label>
                <Controller
                    name={`lots.${lotIndex}.details.description`}
                    control={control}
                    render={({ field }) => (
                        <RichTextEditor
                            placeholder="Describe the artwork..."
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onImageUpload={handleDescriptionImageUpload}
                        />
                    )}
                />
            </div>
        </div>
    );
}