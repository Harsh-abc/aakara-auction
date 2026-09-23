"use client";

import { useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";

import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

import RichTextEditor from "@/components/common/RichTextEditor/RichTextEditor";
import TagsInput from "@/components/common/Tags/TagsInput";
import DashboardFormText from "@/components/common/DashboardFormText";


import { getCategories, getSubCategories } from "@/services/operations/category.api";
import { Category, SubCategory } from "@/lib/types/category.types";
import CurrencySelector from "@/components/common/CurrencySelector";

export default function BasicInfo() {
    const inputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);

    const {
        register,
        setValue,
        watch,
        formState: { errors },
    } = useFormContext<AuctionFormData>();

    /* =====================================================
       WATCH FORM VALUES
    ===================================================== */

    const auctionName = watch("basicInfo.auctionName");
    const auctionType = watch("basicInfo.auctionType");
    const categoryUuid = watch("basicInfo.categoryUuid");
    const coverImage = watch("basicInfo.coverImage");
    const primaryCurrency = watch("basicInfo.primaryCurrency"); // ✅ NEW (preview card)

    // ✅ Show the category NAME in the preview card (was showing the UUID)
    const categoryName = categories.find((c) => c.uuid === categoryUuid)?.name;

    /* =====================================================
       COVER IMAGE
    ===================================================== */

    // ✅ Rebuild the preview when coming back to this step (file is still in the form)
    useEffect(() => {
        if (coverImage instanceof File && coverImage.type.startsWith("image/")) {
            const url = URL.createObjectURL(coverImage);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreview(null);
    }, [coverImage]);

    const handleFile = (file: File) => {
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            alert("File size must be less than 50MB.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Cover must be an image (JPG, PNG or WEBP).");
            return;
        }

        // Preview is created by the effect above
        setValue("basicInfo.coverImage", file, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const removeFile = () => {
        setValue("basicInfo.coverImage", null, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        });
        if (inputRef.current) inputRef.current.value = "";
    };

    /* =====================================================
       CATEGORIES
    ===================================================== */

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setCategoriesLoading(true);
                const response = await getCategories();
                if (response.success) setCategories(response.data);
            } catch (error) {
                console.error("Failed to fetch categories:", error);
            } finally {
                setCategoriesLoading(false);
            }
        };

        fetchCategories();
    }, []);

    useEffect(() => {
        if (!categoryUuid) {
            setSubCategories([]);
            setValue("basicInfo.subCategoryUuid", "", { shouldDirty: true });
            return;
        }

        const fetchSubCategories = async () => {
            try {
                setSubCategoriesLoading(true);
                const response = await getSubCategories(categoryUuid);
                if (response.success) setSubCategories(response.data);
            } catch (error) {
                console.error("Failed to fetch subcategories:", error);
                setSubCategories([]);
            } finally {
                setSubCategoriesLoading(false);
            }
        };

        fetchSubCategories();
    }, [categoryUuid, setValue]);

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">

                {/* ================= LEFT SIDE ================= */}
                <div className="flex-2 w-182.5 px-7 py-7 bg-dashboardFormBg rounded-[8px]">

                    <DashboardFormText text="Auction Details" />

                    {/* AUCTION NAME */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Auction Name</label>
                        <Input
                            {...register("basicInfo.auctionName")}
                            type="text"
                            placeholder="e.g. Modern Master of Mumbai : Autumn Collections"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />
                        {errors.basicInfo?.auctionName && (
                            <p className="text-red-500 text-sm mt-1">Auction name is required</p>
                        )}
                    </div>

                    {/* AUCTION ID + TYPE */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Auction ID / Reference</label>
                            <Input
                                {...register("basicInfo.auctionId")}
                                type="text"
                                placeholder="Enter reference"
                                className="w-full border rounded-md px-3 py-2 h-11"
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">Auction Type</label>
                            <select
                                {...register("basicInfo.auctionType")}
                                className="w-full border rounded-md px-3 py-2 h-11"
                            >
                                <option value="">Select auction type</option>
                                <option value="LIVE">Live Auction</option>
                                <option value="FLOOR">Floor Auction</option>
                                <option value="HYBRID">Hybrid Auction</option>
                            </select>
                            {errors.basicInfo?.auctionType && (
                                <p className="text-red-500 text-sm mt-1">Auction type is required</p>
                            )}
                        </div>
                    </div>

                    {/* SHORT DESCRIPTION */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Short Description</label>
                        <textarea
                            {...register("basicInfo.shortDescription")}
                            rows={3}
                            placeholder="Enter short auction description"
                            className="w-full border rounded-md px-3 py-2"
                        />
                    </div>

                    {/* DETAILED DESCRIPTION */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Detailed Description</label>
                        <RichTextEditor
                            value={watch("basicInfo.description")}
                            onChange={(value: string) => {
                                setValue("basicInfo.description", value, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true,
                                });
                            }}
                        />
                    </div>

                    {/* COVER IMAGE */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Auction Cover Image</label>

                        <div
                            className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white transition ${isDragging ? "border-[#7A3D5E] bg-[#fdf5f9]" : "border-slate-300"
                                }`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleInputChange}
                            />

                            {preview ? (
                                <div className="relative h-[220px] w-full overflow-hidden rounded-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={preview} alt="Auction cover preview" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile();
                                        }}
                                        className="absolute right-3 top-3 rounded-full bg-white p-2 shadow"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="mb-3 h-8 w-8 text-slate-400" />
                                    <p className="text-sm font-medium text-slate-700">Upload Auction Cover Image</p>
                                    <p className="mt-1 text-xs text-slate-400">Drag & drop or click to upload</p>
                                    <p className="mt-1 text-xs text-slate-400">JPG, PNG or WEBP · max 50MB</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* CATEGORY + SUBCATEGORY */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Category</label>
                            <select
                                {...register("basicInfo.categoryUuid", { required: "Category is required" })}
                                className="w-full border rounded-md px-3 py-2 h-11"
                            >
                                <option value="">
                                    {categoriesLoading ? "Loading categories..." : "Select category"}
                                </option>
                                {categories.map((category) => (
                                    <option key={category.uuid} value={category.uuid}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            {errors.basicInfo?.categoryUuid && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.basicInfo.categoryUuid.message || "Category is required"}
                                </p>
                            )}
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">SubCategory</label>
                            <select
                                {...register("basicInfo.subCategoryUuid")}
                                disabled={!categoryUuid || subCategoriesLoading}
                                className="w-full border rounded-md px-3 py-2 h-11 disabled:bg-slate-100 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {!categoryUuid
                                        ? "Select category first"
                                        : subCategoriesLoading
                                            ? "Loading subcategories..."
                                            : "Select subcategory"}
                                </option>
                                {subCategories.map((subCategory) => (
                                    <option key={subCategory.uuid} value={subCategory.uuid}>
                                        {subCategory.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* AUCTION LOCATION */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Auction Location</label>
                            <Input
                                {...register("basicInfo.auctionLocation")}
                                type="text"
                                placeholder="Enter Location"
                                className="w-full border rounded-md px-3 py-2 h-11"
                            />
                        </div>
                    </div>

                    {/* AUCTION TAGS */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Auction Tags</label>
                        <TagsInput
                            value={watch("basicInfo.auctionTags") ?? []}
                            onChange={(tags: string[]) => {
                                setValue("basicInfo.auctionTags", tags, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                });
                            }}
                        />
                    </div>

                    {/* ✅ CURRENCIES — loaded from the `currencies` table, with a primary */}
                    <CurrencySelector />
                </div>

                {/* ================= RIGHT SIDE PREVIEW ================= */}
                <div className="flex-1 w-93">
                    <div className="w-full max-w-[330px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                        <div className="h-[176px] w-full overflow-hidden">
                            {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="Auction cover" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
                                    No cover image
                                </div>
                            )}
                        </div>

                        <div className="p-4">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-medium text-[#833b61]">
                                    {auctionType || "Auction Type"}
                                </span>
                                <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                    {categoryName || "Category"}
                                </span>
                                {primaryCurrency && (
                                    <span className="rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                                        {primaryCurrency}
                                    </span>
                                )}
                            </div>

                            <h3 className="min-h-[40px] text-[15px] font-semibold leading-5 text-slate-700">
                                {auctionName || "Auction Title"}
                            </h3>

                            <div className="my-3 border-t border-slate-200" />

                            <div className="flex items-center justify-between text-[12px]">
                                <span className="text-slate-500">Artworks</span>
                                <span className="font-semibold text-slate-700">
                                    {watch("lots")?.length ?? 0} Items
                                </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[12px]">
                                <span className="text-slate-500">Status</span>
                                <span className="font-semibold text-slate-700">Draft</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}