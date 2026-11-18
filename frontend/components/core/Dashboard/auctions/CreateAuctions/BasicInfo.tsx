"use client";

import { useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";

import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Upload, X } from "lucide-react";
import { useAppSelector } from "@/hooks/redux";
import { useCategories } from "@/hooks/useCategories";

import RichTextEditor from "@/components/common/RichTextEditor/RichTextEditor";
import TagsInput from "@/components/common/Tags/TagsInput";
import DashboardFormText from "@/components/common/DashboardFormText";

import { uploadEditorImage } from "@/services/operations/upload.api";
import CurrencySelector from "@/components/common/CurrencySelector";

// must match slugify in backend/src/services/auction.services.js
const slugify = (text: string) =>
    text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 180);

type ImageField = "coverImage" | "thumbnailImage";

/** Preview of the image picked in this session, else the saved one. */
function useImagePreview(file: File | null | undefined, savedUrl: string | undefined) {
    const [preview, setPreview] = useState<string | null>(null);

    // ✅ Rebuild the preview when coming back to this step (file is still in the form)
    useEffect(() => {
        if (file instanceof File && file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreview(savedUrl || null);
    }, [file, savedUrl]);

    return preview;
}

/** Drag & drop / click-to-pick for one image of the auction (cover or thumbnail). */
function ImageDropzone({
    field,
    label,
    hint,
    preview,
    previewClassName,
}: {
    field: ImageField;
    label: string;
    hint: string;
    preview: string | null;
    /** how the picked image sits in the box */
    previewClassName: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { setValue } = useFormContext<AuctionFormData>();

    const handleFile = (file: File) => {
        if (file.size > 50 * 1024 * 1024) {
            alert("File size must be less than 50MB.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert(`${label} must be an image (JPG, PNG or WEBP).`);
            return;
        }

        // Preview is created by useImagePreview
        setValue(`basicInfo.${field}`, file, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    };

    const removeFile = () => {
        setValue(`basicInfo.${field}`, null, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        // Edit: removing the saved image sends removeCoverImage / removeThumbnailImage
        setValue(`basicInfo.${field}Url`, "", { shouldDirty: true });
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="input-wrapper">
            <label className="block mb-2">{label}</label>

            <div
                className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white transition ${isDragging ? "border-[#7A3D5E] bg-[#fdf5f9]" : "border-slate-300"
                    }`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                }}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                    }}
                />

                {preview ? (
                    <div className="relative h-[220px] w-full overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt={`${label} preview`} className={previewClassName} />
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
                        <p className="text-sm font-medium text-slate-700">Upload {label}</p>
                        <p className="mt-1 text-xs text-slate-400">Drag & drop or click to upload</p>
                        <p className="mt-1 text-xs text-slate-400">{hint}</p>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * The auction's categories — pick as many as the sale covers. The first picked
 * is the primary one; each lot then chooses one of these (and its subcategory).
 */
function CategoryMultiSelect() {
    const { watch, setValue, getValues } = useFormContext<AuctionFormData>();
    const { categories, loading } = useCategories();

    const selected = watch("basicInfo.categoryUuids") ?? [];

    const toggle = (uuid: string) => {
        const current = getValues("basicInfo.categoryUuids") ?? [];
        const next = current.includes(uuid) ? current.filter((u) => u !== uuid) : [...current, uuid];
        setValue("basicInfo.categoryUuids", next, { shouldDirty: true, shouldTouch: true });

        // Lots whose category was just removed move to the (new) primary one
        const fallback = next[0] ?? "";
        (getValues("lots") ?? []).forEach((lot, i) => {
            const lotCategory = lot.details?.categoryUuid ?? "";
            if (!next.includes(lotCategory)) {
                setValue(`lots.${i}.details.categoryUuid`, fallback, { shouldDirty: true });
                setValue(`lots.${i}.details.subCategoryUuid`, "", { shouldDirty: true });
            }
        });
    };

    const nameOf = (uuid: string) => categories.find((c) => c.uuid === uuid)?.name;

    return (
        <div className="input-wrapper">
            <label className="block mb-2">Categories</label>

            {loading && categories.length === 0 ? (
                <p className="text-sm text-slate-400">Loading categories...</p>
            ) : categories.length === 0 ? (
                <p className="text-sm text-slate-400">No categories found.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                        const isSelected = selected.includes(category.uuid);
                        const isPrimary = selected[0] === category.uuid;
                        return (
                            <button
                                key={category.uuid}
                                type="button"
                                onClick={() => toggle(category.uuid)}
                                aria-pressed={isSelected}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition ${isSelected
                                    ? "border-[#7A3D5E] bg-[#fce8f1] text-[#7A3D5E]"
                                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                                    }`}
                            >
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                                {category.name}
                                {isPrimary && selected.length > 1 && (
                                    <span className="rounded bg-[#7A3D5E] px-1.5 text-[10px] font-medium text-white">
                                        Primary
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            <p className={`mt-2 text-xs ${selected.length ? "text-slate-500" : "text-amber-600"}`}>
                {selected.length
                    ? `${selected.length} selected: ${selected.map((u) => nameOf(u) ?? "…").join(", ")}. Each lot picks one of these and its subcategory.`
                    : "Select at least one category. The first one you pick is the primary category."}
            </p>
        </div>
    );
}

export default function BasicInfo() {

    const { categories } = useCategories();

    const {
        register,
        setValue,
        getValues,
        watch,
        formState: { errors, defaultValues },
    } = useFormContext<AuctionFormData>();

    const token = useAppSelector((state) => state.auth.accessToken);

    // images inside the detailed description go straight to S3; the HTML keeps their URLs
    const handleDescriptionImageUpload = useCallback((file: File) => uploadEditorImage(file, token), [token]);

    /* =====================================================
       AUCTION ID — follows the name like a slug
    ===================================================== */

    // editing keeps the saved slug; a new auction's ID follows the name until it's typed over
    const hasSavedSlug = !!defaultValues?.basicInfo?.auctionId;
    const auctionNameField = register("basicInfo.auctionName");

    const handleAuctionNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const currentId = getValues("basicInfo.auctionId");
        const idFollowsName = !currentId || currentId === slugify(getValues("basicInfo.auctionName"));

        auctionNameField.onChange(e);

        if (!hasSavedSlug && idFollowsName) {
            setValue("basicInfo.auctionId", slugify(e.target.value), { shouldDirty: true });
        }
    };

    /* =====================================================
       WATCH FORM VALUES
    ===================================================== */

    const auctionName = watch("basicInfo.auctionName");
    const auctionType = watch("basicInfo.auctionType");
    const categoryUuids = watch("basicInfo.categoryUuids") ?? [];
    const coverImage = watch("basicInfo.coverImage");
    const savedCoverUrl = watch("basicInfo.coverImageUrl"); // edit: cover already on the auction
    const primaryCurrency = watch("basicInfo.primaryCurrency"); // ✅ NEW (preview card)

    // Category NAMES for the preview card
    const categoryNames = categoryUuids
        .map((uuid) => categories.find((c) => c.uuid === uuid)?.name)
        .filter((name): name is string => Boolean(name));

    /* =====================================================
       COVER + THUMBNAIL IMAGES
    ===================================================== */

    const preview = useImagePreview(coverImage, savedCoverUrl);
    const thumbnailPreview = useImagePreview(
        watch("basicInfo.thumbnailImage"),
        watch("basicInfo.thumbnailImageUrl") // edit: thumbnail already on the auction
    );

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
                            {...auctionNameField}
                            onChange={handleAuctionNameChange}
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
                                placeholder="Filled from the auction name"
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
                                <option value="ONLINE">Online Auction</option>
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
                        <RichTextEditor
                            variant="basic"
                            placeholder="Enter short auction description"
                            value={watch("basicInfo.shortDescription")}
                            onChange={(value: string) => {
                                setValue("basicInfo.shortDescription", value, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true,
                                });
                            }}
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
                            onImageUpload={handleDescriptionImageUpload}
                        />
                    </div>

                    {/* COVER IMAGE */}
                    <ImageDropzone
                        field="coverImage"
                        label="Auction Cover Image"
                        hint="JPG, PNG or WEBP · max 50MB"
                        preview={preview}
                        previewClassName="h-full w-full object-cover"
                    />

                    {/* THUMBNAIL — the image in the storefront's Upcoming / Live list (the cover is used when there's none) */}
                    <ImageDropzone
                        field="thumbnailImage"
                        label="Auction Thumbnail"
                        hint="Shown in the auctions list (about 4:3) · JPG, PNG or WEBP · max 50MB"
                        preview={thumbnailPreview}
                        // shown whole, the way the list row shows it
                        previewClassName="h-full w-full object-contain"
                    />

                    {/* CATEGORIES (multi) — subcategories are picked per lot */}
                    <CategoryMultiSelect />

                    {/* AUCTION LOCATION */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Auction Location</label>
                            <Input
                                {...register("basicInfo.auctionLocation", {
                                    // same DB column as the Shipping step's venue — keep them in step so an
                                    // edit here isn't overridden by the venue loaded with the auction
                                    onChange: (e) => setValue("shipping.venue", e.target.value, { shouldDirty: true }),
                                })}
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
                                {categoryNames.length ? (
                                    categoryNames.map((name) => (
                                        <span
                                            key={name}
                                            className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                                        >
                                            {name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                        Category
                                    </span>
                                )}
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