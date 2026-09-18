"use client";

import { Controller, useFormContext } from "react-hook-form";

import DashboardFormText from "@/components/common/DashboardFormText";
import MediaUploader from "./MediaUploader";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";

interface UploadImagesProps {
    lotIndex: number;
}

export default function UploadImages({
    lotIndex,
}: UploadImagesProps) {
    const { control } =
        useFormContext<AuctionFormData>();


    return (
        <div className="px-6 pb-6">

            <DashboardFormText text="Artwork Imagery Catalog" />

            <div className="mt-6">

                <Controller
                    name={`lots.${lotIndex}.images`}
                    control={control}
                    render={({ field }) => (
                        <MediaUploader
                            value={field.value ?? []}
                            onChange={field.onChange}
                        />
                    )}
                />

            </div>

        </div>
    );

}
