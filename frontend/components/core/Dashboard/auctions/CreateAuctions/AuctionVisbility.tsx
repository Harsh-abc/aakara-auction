"use client";


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

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState } from "react";


export default function AuctionVisibility() {

    const [shippingMethod, setShippingMethod] = useState("comfortable");

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-full px-7 py-7 bg-dashboardFormBg rounded-[8px]">

                    <DashboardFormText text="Shipping Strategy" />

                    <div className="grid grid-cols-1 gap-4">

                        <RadioGroup
                            value={shippingMethod}
                            onValueChange={setShippingMethod}
                            className="w-full"
                        >
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
                ${shippingMethod === "default"
                                        ? "border-[#914968]"
                                        : "border-slate-200 bg-white"
                                    }
            `}
                            >
                                <RadioGroupItem
                                    value="default"
                                    id="desc-r1"
                                />

                                <FieldContent>
                                    <FieldLabel
                                        htmlFor="desc-r1"
                                        className="text-[16px] font-semibold"
                                    >
                                        Public Access
                                    </FieldLabel>

                                    <FieldDescription>
                                        Anyone can view the catalog, monitor real-time bids, and sign-up to participate publicly.
                                    </FieldDescription>
                                </FieldContent>
                            </Field>

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
                ${shippingMethod === "comfortable"
                                        ? "border-[#914968]"
                                        : "border-slate-200 bg-white"
                                    }
            `}
                            >
                                <RadioGroupItem
                                    value="comfortable"
                                    id="desc-r2"
                                />

                                <FieldContent>
                                    <FieldLabel
                                        htmlFor="desc-r2"
                                        className="text-[16px] font-semibold"
                                    >
                                        Registrered Users Only
                                    </FieldLabel>

                                    <FieldDescription>
                                        General visitor traffic is hidden. Only approved and authenticated buyers can load bidding metrics.
                                    </FieldDescription>
                                </FieldContent>
                            </Field>

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
                ${shippingMethod === "compact"
                                        ? "border-[#914968]"
                                        : "border-slate-200 bg-white"
                                    }
            `}
                            >
                                <RadioGroupItem
                                    value="compact"
                                    id="desc-r3"
                                />

                                <FieldContent>
                                    <FieldLabel
                                        htmlFor="desc-r3"
                                        className="text-[16px] font-semibold"
                                    >
                                        Private / Invite Only
                                    </FieldLabel>

                                    <FieldDescription>
                                        No organic entrypoint is provided. System inivites must be dispatched to specific wallet / email profiles.
                                    </FieldDescription>
                                </FieldContent>
                            </Field>



                        </RadioGroup>

                    </div>
                </div>
            </div>


        </div>
    );
}




