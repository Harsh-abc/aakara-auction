"use client";

import DashboardFormText from "@/components/common/DashboardFormText";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Controller, useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import type { ShippingStrategy } from "@/lib/types/auction.types";

const SHIPPING_OPTIONS: {
    value: ShippingStrategy;
    id: string;
    label: string;
    description: string;
}[] = [
        {
            value: "SHIPPING_INCLUDED",
            id: "shipping-included",
            label: "Shipping Included",
            description: "Complimentary shipping globally paid by seller",
        },
        {
            value: "SHIPPING_CALCULATED_SEPARATELY",
            id: "shipping-calculated",
            label: "Shipping Calculated Separately",
            description:
                "Buyer pays determined carrier rates dynamically after delivery address confirmation",
        },
        {
            value: "BUYER_ARRANGES_PICKUP",
            id: "buyer-pickup",
            label: "Buyer Arranges Pickup",
            description: "Local gallery hand-over directly to the winning bidder",
        },
        {
            value: "ADMIN_ARRANGES_DELIVERY",
            id: "admin-delivery",
            label: "Admin Arranges Delivery",
            description: "Platform handles custom logistics independently",
        },
    ];

export default function ShippingInfo() {
    const {
        control,
        register,
        watch,
        formState: { errors },
    } = useFormContext<AuctionFormData>();

    const isOnline = watch("shipping.isOnline");
    const shippingStrategy = watch("shipping.shippingStrategy");

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-full px-7 py-7 bg-dashboardFormBg rounded-[8px]">

                    {/* =================================================
                        SHIPPING STRATEGY
                    ================================================= */}

                    <DashboardFormText text="Shipping Strategy" />

                    <div className="grid grid-cols-1 gap-4">
                        <Controller
                            name="shipping.shippingStrategy"
                            control={control}
                            render={({ field }) => (
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="w-full"
                                >
                                    {SHIPPING_OPTIONS.map((option) => (
                                        <Field
                                            key={option.value}
                                            orientation="horizontal"
                                            className={`mt-4 px-3.5 py-3.5 border rounded-[8px] transition-all cursor-pointer ${field.value === option.value
                                                ? "border-[#914968]"
                                                : "border-slate-200 bg-white"
                                                }`}
                                        >
                                            <RadioGroupItem
                                                value={option.value}
                                                id={option.id}
                                            />

                                            <FieldContent>
                                                <FieldLabel
                                                    htmlFor={option.id}
                                                    className="text-[16px] font-semibold"
                                                >
                                                    {option.label}
                                                </FieldLabel>

                                                <FieldDescription>
                                                    {option.description}
                                                </FieldDescription>
                                            </FieldContent>
                                        </Field>
                                    ))}
                                </RadioGroup>
                            )}
                        />
                    </div>

                    {/* =================================================
                        AUCTION MODE (ONLINE / VENUE)
                    ================================================= */}

                    <div className="mt-10">
                        <DashboardFormText text="Auction Mode" />

                        <Controller
                            name="shipping.isOnline"
                            control={control}
                            render={({ field }) => (
                                <div className="mt-4 flex items-center justify-between rounded-[8px] border border-slate-200 bg-white px-3.5 py-3.5">
                                    <div>
                                        <p className="text-[15px] font-semibold text-slate-800">
                                            Online Auction
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            Turn off if bidding also happens at a physical venue
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => field.onChange(!field.value)}
                                        aria-pressed={Boolean(field.value)}
                                        aria-label="Toggle online auction"
                                        className={`relative flex h-[18px] w-[30px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${field.value ? "bg-[#7A3D5E]" : "bg-[#d1d5db]"
                                            }`}
                                    >
                                        <span
                                            className={`absolute h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${field.value
                                                ? "translate-x-[14px]"
                                                : "translate-x-[2px]"
                                                }`}
                                        />
                                    </button>
                                </div>
                            )}
                        />

                        {!isOnline && (
                            <div className="input-wrapper mt-4">
                                <label className="block mb-2">
                                    Venue <span className="text-red-500">*</span>
                                </label>

                                <Input
                                    type="text"
                                    placeholder="e.g. Jehangir Art Gallery, Kala Ghoda, Mumbai"
                                    className="w-full border rounded-md px-3 py-2 h-11 bg-white"
                                    {...register("shipping.venue", {
                                        validate: (value, formValues) =>
                                            formValues.shipping.isOnline ||
                                            Boolean(value?.trim()) ||
                                            "Venue is required for an offline auction",
                                    })}
                                />

                                {errors.shipping?.venue && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.shipping.venue.message}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* =================================================
                        SHIPPING NOTES
                    ================================================= */}

                    <div className="mt-10">
                        <DashboardFormText text="Shipping Notes" />

                        <div className="input-wrapper mt-4">
                            <label className="block mb-2">
                                {shippingStrategy === "BUYER_ARRANGES_PICKUP"
                                    ? "Pickup instructions"
                                    : "Shipping details"}
                            </label>

                            <textarea
                                rows={4}
                                placeholder={
                                    shippingStrategy === "BUYER_ARRANGES_PICKUP"
                                        ? "Pickup address, timings, documents the buyer must bring..."
                                        : "Carrier, packing, insurance in transit, estimated delivery time..."
                                }
                                className="w-full border rounded-md px-3 py-2 bg-white"
                                {...register("shipping.shippingInfo")}
                            />

                            <p className="mt-1 text-xs text-slate-500">
                                Applied to every lot that doesn&apos;t have its own shipping info.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}