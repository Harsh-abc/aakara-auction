"use client";

import { useFormContext, Controller } from "react-hook-form";

import DashboardFormText from "@/components/common/DashboardFormText";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    RadioGroup,
    RadioGroupItem,
} from "@/components/ui/radio-group";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";

interface LotsDetailProps {
    lotIndex: number;
}

export default function LotsDetail({
    lotIndex,
}: LotsDetailProps) {
    const {
        register,
        control,
    } = useFormContext<AuctionFormData>();

    return (
        <div className="px-6 pb-5 mb-20">

            <DashboardFormText text="Primary Artwork Information" />

            {/* =========================
            BASIC ARTWORK INFORMATION
        ========================== */}

            <div className="grid grid-cols-2 gap-4">

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Lot Title
                    </label>

                    <Input
                        type="text"
                        placeholder="Enter a title for your auction (e.g First Auction)"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(
                            `lots.${lotIndex}.details.title`
                        )}
                    />
                </div>

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Artist Name
                    </label>

                    <Input
                        type="text"
                        placeholder="Enter Artist"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(
                            `lots.${lotIndex}.details.artist`
                        )}
                    />
                </div>

            </div>

            <div className="grid grid-cols-2 gap-4">

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Artwork ID
                    </label>

                    <Input
                        type="text"
                        placeholder=""
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(
                            `lots.${lotIndex}.details.artworkId`
                        )}
                    />
                </div>

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Category
                    </label>

                    <select
                        className="w-full border rounded-md px-3 py-2"
                        {...register(
                            `lots.${lotIndex}.details.categoryUuid`
                        )}
                    >
                        <option value="">
                            Select Category type
                        </option>

                        <option value="category-uuid-1">
                            Modern
                        </option>

                        <option value="category-uuid-2">
                            Nature
                        </option>
                    </select>
                </div>

            </div>

            <div className="grid grid-cols-2 gap-4">

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Medium
                    </label>

                    <Input
                        type="text"
                        placeholder="eg. Oil on Canvas, Bronze Sculpture"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(
                            `lots.${lotIndex}.details.medium`
                        )}
                    />
                </div>

                <div className="input-wrapper">
                    <label className="block mb-2">
                        Year of creation
                    </label>

                    <Input
                        type="text"
                        placeholder="YYYY"
                        className="w-full border rounded-md px-3 py-2 h-11"
                        {...register(
                            `lots.${lotIndex}.details.yearCreated`
                        )}
                    />
                </div>

            </div>

            {/* =========================
            MEASUREMENTS
        ========================== */}

            <div className="px-6 bg-[#f4f2f2] py-6 my-6 rounded-[8px]">

                <h1 className="text-[16px] font-bold">
                    Artwork Measurement
                </h1>

                <div className="grid grid-cols-5 gap-4">

                    {/* Width */}

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Width (cm)
                        </label>

                        <Input
                            type="number"
                            placeholder=""
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.details.dimensions.width`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* Height */}

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Height (cm)
                        </label>

                        <Input
                            type="number"
                            placeholder=""
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.details.dimensions.height`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* Depth */}

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Depth (cm)
                        </label>

                        <Input
                            type="number"
                            placeholder=""
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.details.dimensions.depth`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* Unit */}

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Unit
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                            {...register(
                                `lots.${lotIndex}.details.dimensions.unit`
                            )}
                        >
                            <option value="cm">
                                cm
                            </option>

                            <option value="mm">
                                mm
                            </option>

                            <option value="m">
                                M
                            </option>
                        </select>
                    </div>

                    {/* Weight */}

                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Weight (in Kg)
                        </label>

                        <Input
                            type="number"
                            placeholder=""
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.details.weight`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                </div>

            </div>

            {/* =========================
            EDITION TYPE
        ========================== */}

            <div>

                <h6 className="text-[13px] font-semibold">
                    Edition Type
                </h6>

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
                                <RadioGroupItem
                                    value="UNIQUE"
                                    id={`unique-${lotIndex}`}
                                />

                                <Label
                                    htmlFor={`unique-${lotIndex}`}
                                >
                                    Unique / Original
                                </Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <RadioGroupItem
                                    value="LIMITED"
                                    id={`limited-${lotIndex}`}
                                />

                                <Label
                                    htmlFor={`limited-${lotIndex}`}
                                >
                                    Limited Edition
                                </Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <RadioGroupItem
                                    value="OPEN"
                                    id={`open-${lotIndex}`}
                                />

                                <Label
                                    htmlFor={`open-${lotIndex}`}
                                >
                                    Open Edition
                                </Label>
                            </div>

                        </RadioGroup>
                    )}
                />

            </div>

            {/* =========================
            DESCRIPTION
        ========================== */}

            <div className="mt-6">

                <label className="block mb-2">
                    Artwork Description
                </label>

                <textarea
                    placeholder="Describe the artwork..."
                    className="w-full min-h-[120px] border rounded-md px-3 py-2"
                    {...register(
                        `lots.${lotIndex}.details.description`
                    )}
                />

            </div>

        </div>
    );


}
