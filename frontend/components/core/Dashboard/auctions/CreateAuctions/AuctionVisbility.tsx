"use client";

import DashboardFormText from "@/components/common/DashboardFormText";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Controller, useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import type { AuctionVisibility as AuctionVisibilityType } from "@/lib/types/auction.types";

const VISIBILITY_OPTIONS: {
    value: AuctionVisibilityType;
    id: string;
    label: string;
    description: string;
}[] = [
        {
            value: "PUBLIC",
            id: "visibility-public",
            label: "Public Access",
            description:
                "Anyone can view the catalog, monitor real-time bids, and sign-up to participate publicly.",
        },
        {
            value: "REGISTERED_USERS_ONLY",
            id: "visibility-registered",
            label: "Registered Users Only",
            description:
                "General visitor traffic is hidden. Only approved and authenticated buyers can load bidding metrics.",
        },
        {
            value: "PRIVATE_INVITE_ONLY",
            id: "visibility-private",
            label: "Private / Invite Only",
            description:
                "No organic entrypoint is provided. System invites must be dispatched to specific wallet / email profiles.",
        },
    ];

const TERMS_MAX_LENGTH = 10000;

export default function AuctionVisibility() {
    const { control, register, watch } = useFormContext<AuctionFormData>();

    const termsLength = watch("visibility.termsAndConditions")?.length ?? 0;

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-full px-7 py-7 bg-dashboardFormBg rounded-[8px]">

                    {/* =================================================
                        VISIBILITY
                    ================================================= */}

                    <DashboardFormText text="Auction Visibility" />

                    <div className="grid grid-cols-1 gap-4">
                        <Controller
                            name="visibility.visibility"
                            control={control}
                            render={({ field }) => (
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="w-full"
                                >
                                    {VISIBILITY_OPTIONS.map((option) => (
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
                        TERMS & CONDITIONS
                    ================================================= */}

                    <div className="mt-10">
                        <DashboardFormText text="Terms & Conditions" />

                        <div className="input-wrapper mt-4">
                            <label className="block mb-2">
                                Auction-specific terms shown to bidders before they register
                            </label>

                            <textarea
                                rows={8}
                                maxLength={TERMS_MAX_LENGTH}
                                placeholder="e.g. All lots are sold as-is. Buyer's premium and GST are payable on the hammer price. Payment is due within 7 days of the auction closing..."
                                className="w-full border rounded-md px-3 py-2 bg-white"
                                {...register("visibility.termsAndConditions")}
                            />

                            <p className="mt-1 text-right text-xs text-slate-400">
                                {termsLength.toLocaleString("en-IN")} / {TERMS_MAX_LENGTH.toLocaleString("en-IN")}
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}