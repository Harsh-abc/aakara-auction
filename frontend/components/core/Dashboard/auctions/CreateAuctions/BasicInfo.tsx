"use client";

import { useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import RichTextEditor from "@/components/common/RichTextEditor/RichTextEditor";
import ImageUploader from "@/components/common/ImageUploader/ImageUploader";
import TagsInput from "@/components/common/Tags/TagsInput";
import DashboardFormText from "@/components/common/DashboardFormText";

import { Checkbox } from "@/components/ui/checkbox"
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldTitle,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"

export default function BasicInfo() {

    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = (file: File) => {
        if (!file) return;

        // 50MB validation
        if (file.size > 50 * 1024 * 1024) {
            alert("File size must be less than 50MB.");
            return;
        }



        // Preview
        if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (file) {
            handleFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];

        if (file) {
            handleFile(file);
        }
    };

    const removeFile = () => {
        setPreview(null);


        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };


    const {
        register,
        formState: { errors },
    } = useFormContext<AuctionFormData>();

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-182.5 px-7 py-7 bg-dashboardFormBg rounded-[8px]">

                    <DashboardFormText text="Auction Details" />

                    <div className="input-wrapper ">
                        <label className="block mb-2">
                            Auction Name
                        </label>
                        <Input
                            {...register("basicInfo.name")}
                            type="text"
                            placeholder="e.g. Modern Master of Mumbai : Autumn Collections"
                            className="w-full border rounded-md px-3 py-2 h-11"
                        />

                        {errors.basicInfo?.name && (
                            <p className="text-red-500 text-sm mt-1">
                                Auction name is required
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction ID / Reference
                            </label>

                            <Input
                                {...register("basicInfo.reference")}
                                type="text"
                                placeholder="Enter reference"
                                className="w-full border rounded-md px-3 py-2 h-11"
                            />
                        </div>

                        <div className="input-wrapper ">
                            <label className="block mb-2">
                                Auction Type
                            </label>

                            <select
                                {...register("basicInfo.auctionType")}
                                className="w-full border rounded-md px-3 py-2"
                            >
                                <option value="">
                                    Select auction type
                                </option>

                                <option value="live">
                                    Live Auction
                                </option>

                                <option value="online">
                                    Online Auction
                                </option>
                            </select>
                        </div>

                    </div>


                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Short Description
                        </label>

                        <textarea
                            {...register("basicInfo.description")}
                            rows={3}
                            placeholder="Enter auction description"
                            className="w-full border rounded-md px-3 py-2"
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Detailed Description
                        </label>
                        <RichTextEditor />
                    </div>

                    <div className="input-wrapper ">
                        <ImageUploader />
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Category
                            </label>

                            <select
                                {...register("basicInfo.category")}
                                className="w-full border rounded-md px-3 py-2"
                            >
                                <option value="">
                                    Select category
                                </option>

                                <option value="live">
                                    Live Auction
                                </option>

                                <option value="online">
                                    Online Auction
                                </option>
                            </select>
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                SubCategory
                            </label>

                            <select
                                {...register("basicInfo.subCategory")}
                                className="w-full border rounded-md px-3 py-2"
                            >
                                <option value="">
                                    Select subcategory
                                </option>

                                <option value="live">
                                    Live Auction
                                </option>

                                <option value="online">
                                    Online Auction
                                </option>
                            </select>
                        </div>

                    </div>

                    <div className="grid grid-cols-1 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Location
                            </label>

                            <Input
                                {...register("basicInfo.reference")}
                                type="text"
                                placeholder="Enter Location"
                                className="w-full border rounded-md px-3 py-2 h-11"
                            />
                        </div>

                    </div>
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Auctions Tags
                        </label>
                        <TagsInput />
                    </div>

                    <div className="grid grid-cols-1 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auctions Currency
                            </label>
                        </div>
                        <FieldGroup className="flex flex-row items-center gap-6">
                            <Field orientation="horizontal" className="w-auto">
                                <Checkbox id="currency-inr" name="currency" value="INR" />
                                <Label htmlFor="currency-inr">INR</Label>
                            </Field>

                            <Field orientation="horizontal" className="w-auto">
                                <Checkbox id="currency-usd" name="currency" value="USD" />
                                <Label htmlFor="currency-usd">USD</Label>
                            </Field>

                            <Field orientation="horizontal" className="w-auto">
                                <Checkbox id="currency-eur" name="currency" value="EUR" />
                                <Label htmlFor="currency-eur">EUR</Label>
                            </Field>

                            <Field orientation="horizontal" className="w-auto">
                                <Checkbox id="currency-gbp" name="currency" value="GBP" />
                                <Label htmlFor="currency-gbp">GBP</Label>
                            </Field>

                            <Field orientation="horizontal" className="w-auto">
                                <Checkbox id="currency-jpy" name="currency" value="JPY" />
                                <Label htmlFor="currency-jpy">JPY</Label>
                            </Field>
                        </FieldGroup>

                    </div>
                </div>
                <div className="flex-1 w-93">
                    <div className="w-full max-w-[330px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="h-[176px] w-full overflow-hidden">
                            <img
                                src={''}
                                alt={''}
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <div className="p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-medium text-[#833b61]">
                                    auctionType
                                </span>

                                <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                    category
                                </span>
                            </div>

                            <h3 className="min-h-[40px] text-[15px] font-semibold leading-5 text-slate-700">
                                title
                            </h3>

                            <div className="my-3 border-t border-slate-200" />

                            <div className="flex items-center justify-between text-[12px]">
                                <span className="text-slate-500">
                                    Artworks
                                </span>

                                <span className="font-semibold text-slate-700">
                                    artworkCount Item
                                </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[12px]">
                                <span className="text-slate-500">
                                    Status
                                </span>

                                <span className="font-semibold text-slate-700">
                                    status
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}






export function CheckboxDemo() {
    return (
        <FieldGroup className="max-w-sm">
            <Field orientation="horizontal">
                <Checkbox id="terms-checkbox" name="terms-checkbox" />
                <Label htmlFor="terms-checkbox">Accept terms and conditions</Label>
            </Field>
            <Field orientation="horizontal">
                <Checkbox
                    id="terms-checkbox-2"
                    name="terms-checkbox-2"
                    defaultChecked
                />
                <FieldContent>
                    <FieldLabel htmlFor="terms-checkbox-2">
                        Accept terms and conditions
                    </FieldLabel>
                    <FieldDescription>
                        By clicking this checkbox, you agree to the terms.
                    </FieldDescription>
                </FieldContent>
            </Field>
            <Field orientation="horizontal" data-disabled>
                <Checkbox id="toggle-checkbox" name="toggle-checkbox" disabled />
                <FieldLabel htmlFor="toggle-checkbox">Enable notifications</FieldLabel>
            </Field>
            <FieldLabel>
                <Field orientation="horizontal">
                    <Checkbox id="toggle-checkbox-2" name="toggle-checkbox-2" />
                    <FieldContent>
                        <FieldTitle>Enable notifications</FieldTitle>
                        <FieldDescription>
                            You can enable or disable notifications at any time.
                        </FieldDescription>
                    </FieldContent>
                </Field>
            </FieldLabel>
        </FieldGroup>
    )
}
