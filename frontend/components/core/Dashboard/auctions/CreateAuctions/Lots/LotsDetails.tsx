"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { PiCommandLight } from "react-icons/pi";
import { useAppSelector } from "@/hooks/redux";
import { useCategories, useSubCategories } from "@/hooks/useCategories";

import DashboardFormText from "@/components/common/DashboardFormText";
import RichTextEditor from "@/components/common/RichTextEditor/RichTextEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import { uploadEditorImage } from "@/services/operations/upload.api";
import type { DimensionUnit } from "@/lib/types/auction.types";
import { DIMENSION_SIDES, DIMENSION_UNITS } from "@/utils/dimensions";

import LotSchedule from "./LotSchedule";

interface LotsDetailProps {
    lotIndex: number;
}



/** Names for a category (+ optional subcategory) uuid pair. */
export function useAuctionCategoryName(categoryUuid?: string, subCategoryUuid?: string) {
    const { categories, loading: categoriesLoading } = useCategories();
    const { subCategories, loading: subLoading } = useSubCategories(subCategoryUuid ? categoryUuid : undefined);

    const categoryName = categoryUuid ? categories.find((c) => c.uuid === categoryUuid)?.name ?? null : null;
    const subCategoryName = subCategoryUuid
        ? subCategories.find((s) => s.uuid === subCategoryUuid)?.name ?? null
        : null;

    return { categoryName, subCategoryName, loading: !!categoryUuid && (categoriesLoading || subLoading) };
}

/** "Painting / Oil" style label for a lot's category, or "" if none. */
export function useLotCategoryLabel(categoryUuid?: string, subCategoryUuid?: string) {
    const { categoryName, subCategoryName, loading } = useAuctionCategoryName(categoryUuid, subCategoryUuid);
    if (!categoryUuid) return "";
    if (loading) return "Loading...";
    if (!categoryName) return "Unknown category";
    return subCategoryName ? `${categoryName} / ${subCategoryName}` : categoryName;
}

/**
 * The lot's category (one of the auction's, picked in Basic Info) and its
 * subcategory (any subcategory of that category).
 */
function LotCategoryFields({ lotIndex }: { lotIndex: number }) {
    const { control, setValue, getValues } = useFormContext<AuctionFormData>();

    const auctionCategoryUuids = useWatch({ control, name: "basicInfo.categoryUuids" });
    const lotCategoryUuid = useWatch({ control, name: `lots.${lotIndex}.details.categoryUuid` });
    const lotSubCategoryUuid = useWatch({ control, name: `lots.${lotIndex}.details.subCategoryUuid` });

    const { categories, loading: categoriesLoading } = useCategories();
    const { subCategories, loading: subLoading } = useSubCategories(lotCategoryUuid || undefined);

    const allowed = useMemo(() => auctionCategoryUuids ?? [], [auctionCategoryUuids]);
    const options = allowed.map((uuid) => ({
        uuid,
        name: categories.find((c) => c.uuid === uuid)?.name ?? (categoriesLoading ? "Loading..." : "Unknown category"),
    }));

    // Keep the lot on one of the auction's categories (e.g. a lot added before the
    // categories were picked, or whose category was removed)
    useEffect(() => {
        const path = `lots.${lotIndex}.details.categoryUuid` as const;
        const current = getValues(path) ?? "";
        if (!allowed.includes(current)) {
            const fallback = allowed[0] ?? "";
            if (current !== fallback) {
                setValue(path, fallback, { shouldDirty: true });
                setValue(`lots.${lotIndex}.details.subCategoryUuid`, "", { shouldDirty: true });
            }
        }
    }, [allowed, lotIndex, getValues, setValue]);

    // A saved subcategory that isn't under the chosen category is dropped
    useEffect(() => {
        if (subLoading || !lotCategoryUuid || !lotSubCategoryUuid) return;
        if (!subCategories.some((s) => s.uuid === lotSubCategoryUuid)) {
            setValue(`lots.${lotIndex}.details.subCategoryUuid`, "", { shouldDirty: true });
        }
    }, [subCategories, subLoading, lotCategoryUuid, lotSubCategoryUuid, lotIndex, setValue]);

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="input-wrapper">
                <label className="block mb-2">Category</label>
                <Controller
                    name={`lots.${lotIndex}.details.categoryUuid`}
                    control={control}
                    render={({ field }) => (
                        <select
                            value={field.value ?? ""}
                            onChange={(e) => {
                                field.onChange(e.target.value);
                                // new category -> its subcategories start over
                                setValue(`lots.${lotIndex}.details.subCategoryUuid`, "", { shouldDirty: true });
                            }}
                            onBlur={field.onBlur}
                            disabled={allowed.length === 0}
                            className="w-full border rounded-md px-3 py-2 h-11 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                            {allowed.length === 0 && <option value="">Select categories in Basic Info</option>}
                            {options.map((option) => (
                                <option key={option.uuid} value={option.uuid}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    )}
                />
                <p className={`mt-1 text-xs ${allowed.length ? "text-slate-500" : "text-amber-600"}`}>
                    {allowed.length
                        ? "From the auction's categories (Step 1: Basic Info)."
                        : "No category selected yet. Choose them in Step 1: Basic Info."}
                </p>
            </div>

            <div className="input-wrapper">
                <label className="block mb-2">SubCategory</label>
                <Controller
                    name={`lots.${lotIndex}.details.subCategoryUuid`}
                    control={control}
                    render={({ field }) => (
                        <select
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            disabled={!lotCategoryUuid || subLoading}
                            className="w-full border rounded-md px-3 py-2 h-11 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                            <option value="">
                                {!lotCategoryUuid
                                    ? "Select category first"
                                    : subLoading
                                        ? "Loading subcategories..."
                                        : subCategories.length
                                            ? "Select subcategory"
                                            : "No subcategories"}
                            </option>
                            {subCategories.map((sub) => (
                                <option key={sub.uuid} value={sub.uuid}>
                                    {sub.name}
                                </option>
                            ))}
                        </select>
                    )}
                />
            </div>
        </div>
    );
}



// One size set: height / width / depth and its unit. Both sets are entered by
// hand — nothing is converted between them.
function SizeRow({ lotIndex, set }: { lotIndex: number; set: "primary" | "secondary" }) {
    const { register, control } = useFormContext<AuctionFormData>();

    const base = `lots.${lotIndex}.details.dimensions.${set}` as const;
    const unitLabel = useWatch({ control, name: `${base}.unit` });
    const label = DIMENSION_UNITS.find((u) => u.value === unitLabel)?.label ?? "";

    return (
        <div className="grid grid-cols-4 gap-4">
            {DIMENSION_SIDES.map((side) => (
                <div key={side} className="input-wrapper">
                    <label className="block mb-2 capitalize">{label ? `${side} (${label})` : side}</label>
                    <Input
                        type="number"
                        step="any"
                        min={0}
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(`${base}.${side}`, { valueAsNumber: true })}
                    />
                </div>
            ))}

            <div className="input-wrapper">
                <label className="block mb-2">Unit</label>
                <Controller
                    name={`${base}.unit`}
                    control={control}
                    render={({ field }) => (
                        <select
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value as DimensionUnit)}
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
    const { register, control } = useFormContext<AuctionFormData>();

    const token = useAppSelector((state) => state.auth.accessToken);

    // images inside the artwork description go straight to S3; the HTML keeps their URLs
    const handleDescriptionImageUpload = useCallback((file: File) => uploadEditorImage(file, token), [token]);

    return (
        <div className="px-6 pb-5 mb-20">

            <DashboardFormText text="Primary Artwork Information" />

            {/* Special lot — the storefront shows the special-lot icon next to "Lot N" */}
            <div className="mb-4 flex items-center gap-3">
                <input
                    type="checkbox"
                    id={`special-${lotIndex}`}
                    className="h-4 w-4 cursor-pointer accent-[#7b3b5e]"
                    {...register(`lots.${lotIndex}.details.isSpecial`)}
                />
                <Label htmlFor={`special-${lotIndex}`} className="flex cursor-pointer items-center gap-1.5">
                    <PiCommandLight className="h-4 w-4" />
                    Mark as special lot
                </Label>
            </div>

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

            {/* Artist's life dates — free text so "c. 1920" fits; leave death year blank for a living artist */}
            <div className="grid grid-cols-2 gap-4">
                <div className="input-wrapper">
                    <label className="block mb-2">Artist Birth Year</label>
                    <Input
                        type="text"
                        placeholder="YYYY"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(`lots.${lotIndex}.details.artistBirthYear`)}
                    />
                </div>

                <div className="input-wrapper">
                    <label className="block mb-2">Artist Death Year</label>
                    <Input
                        type="text"
                        placeholder="YYYY (leave blank if living)"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(`lots.${lotIndex}.details.artistDeathYear`)}
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
            </div>

            {/* Category (one of the auction's) + its subcategory */}
            <LotCategoryFields lotIndex={lotIndex} />

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

            {/* shown on the lot page under Lot details › Description, one line per row */}
            <div className="input-wrapper">
                <label className="block mb-2">Catalogue Description</label>
                <textarea
                    rows={4}
                    placeholder={"eg. signed and dated lower right\ninscribed on the reverse"}
                    className="w-full border rounded-md px-3 py-2"
                    {...register(`lots.${lotIndex}.details.catalogueNote`)}
                />
                <p className="mt-1 text-xs text-slate-500">
                    Shown on the lot page under Lot details › Description. Each line appears on its own row; leave a blank line to start a new block.
                </p>
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
                    Enter the size in each unit you want shown — both rows are filled in by hand.
                </p>

                <SizeRow lotIndex={lotIndex} set="primary" />
                <SizeRow lotIndex={lotIndex} set="secondary" />

                <div className="input-wrapper mb-4">
                    <label className="block mb-2">Extra Measurement</label>
                    <Controller
                        name={`lots.${lotIndex}.details.extraMeasurement`}
                        control={control}
                        render={({ field }) => (
                            <RichTextEditor
                                variant="basic"
                                placeholder="e.g. Framed: 30 × 38 in"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                            />
                        )}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Shown on the lines below the size on the site, each line of it on its own row. Leave an empty line to add a gap.
                    </p>
                </div>

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
                DESCRIPTION
            ========================== */}

            <div>
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