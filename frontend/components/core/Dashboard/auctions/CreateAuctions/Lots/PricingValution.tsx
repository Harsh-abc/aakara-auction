
"use client";

import DashboardFormText from "@/components/common/DashboardFormText";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";

interface PricingValuationProps {
    lotIndex: number;
}

export default function PricingValuation({
    lotIndex,
}: PricingValuationProps) {
    const { register } = useFormContext<AuctionFormData>();

    return (
        <div className="px-6 pb-6">
            <div>
                <DashboardFormText text="Finacial Strategy & Thresholds" />

                <div className="grid grid-cols-3 gap-4 w-full">

                    {/* Starting Bid Price */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Starting Bid Price
                        </label>

                        <Input
                            type="number"
                            placeholder="₹ Enter Starting Bid Amount"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.startingPrice`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* Reserve Price */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Reserve Price
                        </label>

                        <Input
                            type="number"
                            placeholder="₹ Enter Reserve Price"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.reservePrice`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* Minimum Price */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Minimum Price
                        </label>

                        <Input
                            type="number"
                            placeholder="₹ Enter Minimum Price"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.minimumPrice`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 w-full mt-4">

                    {/* Estimated Start Value */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Estimated Start Value
                        </label>

                        <Input
                            type="number"
                            placeholder="₹ Enter Estimated Start Value"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.estimateFrom`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* Estimated End Value */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Estimated End Value
                        </label>

                        <Input
                            type="number"
                            placeholder="₹ Enter Estimated End Value"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.estimateTo`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* Insurance Declared Value */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Insurance Declared value
                        </label>

                        <Input
                            type="number"
                            placeholder="₹ Insurance Declared value"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.insuranceDeclaredValue`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* Currency */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Currency
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.currency`
                            )}
                        >
                            <option value="">
                                Select Currency
                            </option>

                            <option value="INR">
                                INR
                            </option>

                            <option value="USD">
                                DOLLAR
                            </option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="mt-10">
                <DashboardFormText text="Finacial Strategy & Thresholds" />

                <div className="grid grid-cols-2 gap-4 w-full">

                    {/* GST Rate */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            GST Rate (%)
                        </label>

                        <Input
                            type="number"
                            placeholder="Enter A GST Rate"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.gstRate`,
                                {
                                    valueAsNumber: true,
                                }
                            )}
                        />
                    </div>

                    {/* HSN Code */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            HSN Code
                        </label>

                        <Input
                            type="text"
                            placeholder="Enter HSN Code"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.pricing.hsnCode`
                            )}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
