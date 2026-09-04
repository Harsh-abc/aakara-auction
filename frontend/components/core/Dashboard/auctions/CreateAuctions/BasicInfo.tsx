"use client";

import { useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import RichTextEditor from "@/components/common/RichTextEditor/RichTextEditor";
import ImageUploader from "@/components/common/ImageUploader/ImageUploader";
import TagsInput from "@/components/common/Tags/TagsInput";



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
                    <div className="">
                        <h1 className="text-[18px] font-bold">Auction Details</h1>
                    </div>

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
                </div>
                <div className="flex-1 w-93">
                    <div className="flex items-start gap-4 pb-10 border rounded-[8px] h-100 bg-dashboardFormBg">
                        <h1 className="text-[18px] font-bold flex items-center justify-center text-center">
                            Auction Image
                        </h1>
                    </div>
                </div>
            </div>


        </div>
    );
}



