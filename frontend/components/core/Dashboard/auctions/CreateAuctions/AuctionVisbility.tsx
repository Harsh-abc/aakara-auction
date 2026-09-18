
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

export default function AuctionVisibility() {
    const { control } = useFormContext<AuctionFormData>();

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-full px-7 py-7 bg-dashboardFormBg rounded-[8px]">

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
                                    {/* Public Access */}
                                    <Field
                                        orientation="horizontal"
                                        className={`
                                            mt-4
                                            px-3.5
                                            py-3.5
                                            border
                                            rounded-[8px]
                                            transition-all
                                            cursor-pointer
                                            ${field.value === "PUBLIC"
                                                ? "border-[#914968]"
                                                : "border-slate-200 bg-white"
                                            }
                                        `}
                                    >
                                        <RadioGroupItem
                                            value="PUBLIC"
                                            id="visibility-public"
                                        />

                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor="visibility-public"
                                                className="text-[16px] font-semibold"
                                            >
                                                Public Access
                                            </FieldLabel>

                                            <FieldDescription>
                                                Anyone can view the catalog, monitor real-time bids,
                                                and sign-up to participate publicly.
                                            </FieldDescription>
                                        </FieldContent>
                                    </Field>

                                    {/* Registered Users Only */}
                                    <Field
                                        orientation="horizontal"
                                        className={`
                                            mt-4
                                            px-3.5
                                            py-3.5
                                            border
                                            rounded-[8px]
                                            transition-all
                                            cursor-pointer
                                            ${field.value ===
                                                "REGISTERED_USERS_ONLY"
                                                ? "border-[#914968]"
                                                : "border-slate-200 bg-white"
                                            }
                                        `}
                                    >
                                        <RadioGroupItem
                                            value="REGISTERED_USERS_ONLY"
                                            id="visibility-registered"
                                        />

                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor="visibility-registered"
                                                className="text-[16px] font-semibold"
                                            >
                                                Registered Users Only
                                            </FieldLabel>

                                            <FieldDescription>
                                                General visitor traffic is hidden. Only approved
                                                and authenticated buyers can load bidding metrics.
                                            </FieldDescription>
                                        </FieldContent>
                                    </Field>

                                    {/* Private / Invite Only */}
                                    <Field
                                        orientation="horizontal"
                                        className={`
                                            mt-4
                                            px-3.5
                                            py-3.5
                                            border
                                            rounded-[8px]
                                            transition-all
                                            cursor-pointer
                                            ${field.value ===
                                                "PRIVATE_INVITE_ONLY"
                                                ? "border-[#914968]"
                                                : "border-slate-200 bg-white"
                                            }
                                        `}
                                    >
                                        <RadioGroupItem
                                            value="PRIVATE_INVITE_ONLY"
                                            id="visibility-private"
                                        />

                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor="visibility-private"
                                                className="text-[16px] font-semibold"
                                            >
                                                Private / Invite Only
                                            </FieldLabel>

                                            <FieldDescription>
                                                No organic entrypoint is provided. System invites
                                                must be dispatched to specific wallet / email
                                                profiles.
                                            </FieldDescription>
                                        </FieldContent>
                                    </Field>
                                </RadioGroup>
                            )}
                        />

                    </div>
                </div>
            </div>
        </div>
    );
}
