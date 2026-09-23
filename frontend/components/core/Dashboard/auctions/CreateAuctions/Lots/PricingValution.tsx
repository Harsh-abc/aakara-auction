"use client";

import DashboardFormText from "@/components/common/DashboardFormText";
import { Input } from "@/components/ui/input";
import { useFormContext, useWatch } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import LotCurrencySelect from "@/components/common/LotCurrencySelect";
import { useCurrencies } from "@/hooks/useCurrencies";

interface PricingValuationProps {
    lotIndex: number;
}

export default function PricingValuation({ lotIndex }: PricingValuationProps) {
    const { register, control } = useFormContext<AuctionFormData>();
    const { currencies } = useCurrencies();

    // ✅ Placeholders follow the lot's currency (₹ / $ / د.إ ...)
    const lotCurrency = useWatch({ control, name: `lots.${lotIndex}.pricing.currency` });
    const symbol = currencies.find((c) => c.code === lotCurrency)?.symbol ?? lotCurrency ?? "";

    return (
        <div className="px-6 pb-6">
            <div>
                <DashboardFormText text="Financial Strategy & Thresholds" />

                <div className="grid grid-cols-3 gap-4 w-full">
                    {/* Currency — first, so prices below are entered in it */}
                    <LotCurrencySelect lotIndex={lotIndex} />

                    {/* Starting Bid Price */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Starting Bid Price</label>
                        <Input
                            type="number"
                            min={0}
                            placeholder={`${symbol} Enter Starting Bid Amount`}
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.pricing.startingPrice`, { valueAsNumber: true })}
                        />
                    </div>

                    {/* Reserve Price */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Reserve Price</label>
                        <Input
                            type="number"
                            min={0}
                            placeholder={`${symbol} Enter Reserve Price`}
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.pricing.reservePrice`, { valueAsNumber: true })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 w-full mt-4">
                    {/* Minimum Price (UI only for now) */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Minimum Price</label>
                        <Input
                            type="number"
                            min={0}
                            placeholder={`${symbol} Enter Minimum Price`}
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.pricing.minimumPrice`, { valueAsNumber: true })}
                        />
                    </div>

                    {/* Estimated Start Value */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Estimated Start Value</label>
                        <Input
                            type="number"
                            min={0}
                            placeholder={`${symbol} Estimate from`}
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.pricing.estimateFrom`, { valueAsNumber: true })}
                        />
                    </div>

                    {/* Estimated End Value */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Estimated End Value</label>
                        <Input
                            type="number"
                            min={0}
                            placeholder={`${symbol} Estimate to`}
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.pricing.estimateTo`, { valueAsNumber: true })}
                        />
                    </div>

                    {/* Insurance Declared Value */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Insurance Declared Value</label>
                        <Input
                            type="number"
                            min={0}
                            placeholder={`${symbol} Insurance value`}
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.pricing.insuranceDeclaredValue`, { valueAsNumber: true })}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-10">
                <DashboardFormText text="Tax Details" />

                <div className="grid grid-cols-2 gap-4 w-full">
                    {/* GST Rate */}
                    <div className="input-wrapper">
                        <label className="block mb-2">GST Rate (%)</label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="Enter a GST rate"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.pricing.gstRate`, { valueAsNumber: true })}
                        />
                    </div>

                    {/* HSN Code */}
                    <div className="input-wrapper">
                        <label className="block mb-2">HSN Code</label>
                        <Input
                            type="text"
                            placeholder="e.g. 9701"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.pricing.hsnCode`)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}