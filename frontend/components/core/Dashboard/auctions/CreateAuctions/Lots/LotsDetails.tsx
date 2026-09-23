"use client";

import { useEffect, useState } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { Lock } from "lucide-react";

import DashboardFormText from "@/components/common/DashboardFormText";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import { getCategories, getSubCategories } from "@/services/operations/category.api";
import type { Category, SubCategory } from "@/lib/types/category.types";

interface LotsDetailProps {
    lotIndex: number;
}



function useAuctionCategoryName(categoryUuid?: string, subCategoryUuid?: string) {
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



export default function LotsDetail({ lotIndex }: LotsDetailProps) {
    const { register, control, setValue, getValues } = useFormContext<AuctionFormData>();

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
                MEASUREMENTS
            ========================== */}

            <div className="px-6 bg-[#f4f2f2] py-6 my-6 rounded-[8px]">
                <h1 className="text-[16px] font-bold">Artwork Measurement</h1>

                <div className="grid grid-cols-5 gap-4">
                    <div className="input-wrapper">
                        <label className="block mb-2">Width</label>
                        <Input
                            type="number"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.details.dimensions.width`, { valueAsNumber: true })}
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="block mb-2">Height</label>
                        <Input
                            type="number"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.details.dimensions.height`, { valueAsNumber: true })}
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="block mb-2">Depth</label>
                        <Input
                            type="number"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.details.dimensions.depth`, { valueAsNumber: true })}
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="block mb-2">Unit</label>
                        <select
                            {...register(`lots.${lotIndex}.details.dimensions.unit`)}
                            className="w-full border rounded-md px-3 py-2 h-11"
                        >
                            <option value="CM">cm</option>
                            <option value="MM">mm</option>
                            <option value="INCH">inch</option>
                            <option value="METER">m</option>
                            <option value="FEET">ft</option>
                        </select>
                    </div>

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
                <textarea
                    placeholder="Describe the artwork..."
                    className="w-full min-h-[120px] border rounded-md px-3 py-2"
                    {...register(`lots.${lotIndex}.details.description`)}
                />
            </div>
        </div>
    );
}