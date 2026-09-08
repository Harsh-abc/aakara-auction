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


export default function ShippingInfo() {

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
                                        Shipping Included
                                    </FieldLabel>

                                    <FieldDescription>
                                        Complimentary shipping globally paid by seller
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
                                        Shipping Calculated Separately
                                    </FieldLabel>

                                    <FieldDescription>
                                        Buyer pays determined carrier rates dynamically
                                        after delivery address confirmation
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
                                        Buyer Arranges Pickup
                                    </FieldLabel>

                                    <FieldDescription>
                                        Local gallery hand-over directly to the winning bidder
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
                ${shippingMethod === "platform"
                                        ? "border-[#914968] "
                                        : "border-slate-200 bg-white"
                                    }
            `}
                            >
                                <RadioGroupItem
                                    value="platform"
                                    id="desc-r4"
                                />

                                <FieldContent>
                                    <FieldLabel
                                        htmlFor="desc-r4"
                                        className="text-[16px] font-semibold"
                                    >
                                        Admin Arranges Delivery
                                    </FieldLabel>

                                    <FieldDescription>
                                        Platform handles custom logistics independently
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




