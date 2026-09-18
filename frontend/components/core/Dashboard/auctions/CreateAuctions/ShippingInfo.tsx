
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

export default function ShippingInfo() {
    const { control } = useFormContext<AuctionFormData>();

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-full px-7 py-7 bg-dashboardFormBg rounded-[8px]">

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
                                    {/* Shipping Included */}
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
                                                "SHIPPING_INCLUDED"
                                                ? "border-[#914968]"
                                                : "border-slate-200 bg-white"
                                            }
                                        `}
                                    >
                                        <RadioGroupItem
                                            value="SHIPPING_INCLUDED"
                                            id="shipping-included"
                                        />

                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor="shipping-included"
                                                className="text-[16px] font-semibold"
                                            >
                                                Shipping Included
                                            </FieldLabel>

                                            <FieldDescription>
                                                Complimentary shipping globally paid by seller
                                            </FieldDescription>
                                        </FieldContent>
                                    </Field>

                                    {/* Shipping Calculated Separately */}
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
                                                "SHIPPING_CALCULATED_SEPARATELY"
                                                ? "border-[#914968]"
                                                : "border-slate-200 bg-white"
                                            }
                                        `}
                                    >
                                        <RadioGroupItem
                                            value="SHIPPING_CALCULATED_SEPARATELY"
                                            id="shipping-calculated"
                                        />

                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor="shipping-calculated"
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

                                    {/* Buyer Arranges Pickup */}
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
                                                "BUYER_ARRANGES_PICKUP"
                                                ? "border-[#914968]"
                                                : "border-slate-200 bg-white"
                                            }
                                        `}
                                    >
                                        <RadioGroupItem
                                            value="BUYER_ARRANGES_PICKUP"
                                            id="buyer-pickup"
                                        />

                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor="buyer-pickup"
                                                className="text-[16px] font-semibold"
                                            >
                                                Buyer Arranges Pickup
                                            </FieldLabel>

                                            <FieldDescription>
                                                Local gallery hand-over directly to the winning bidder
                                            </FieldDescription>
                                        </FieldContent>
                                    </Field>

                                    {/* Admin Arranges Delivery */}
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
                                                "ADMIN_ARRANGES_DELIVERY"
                                                ? "border-[#914968]"
                                                : "border-slate-200 bg-white"
                                            }
                                        `}
                                    >
                                        <RadioGroupItem
                                            value="ADMIN_ARRANGES_DELIVERY"
                                            id="admin-delivery"
                                        />

                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor="admin-delivery"
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
                            )}
                        />

                    </div>
                </div>
            </div>
        </div>
    );
}
