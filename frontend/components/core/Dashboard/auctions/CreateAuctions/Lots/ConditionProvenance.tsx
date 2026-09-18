
"use client";

import DashboardFormText from "@/components/common/DashboardFormText";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import { Input } from "@/components/ui/input";
import {
    Controller,
    useFormContext,
} from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";

interface ConditionProvenanceProps {
    lotIndex: number;
}

export default function ConditionProvenance({
    lotIndex,
}: ConditionProvenanceProps) {
    const { register, control } =
        useFormContext<AuctionFormData>();

    return (
        <div className="px-6">
            {/* ==================== CONDITION REPORT ==================== */}
            <div className="mt-10">
                <DashboardFormText text="Condition Report" />

                <div className="grid grid-cols-2 gap-2 w-full">

                    {/* Overall Condition */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Overall Condition Class
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                            {...register(
                                `lots.${lotIndex}.condition.overallCondition`
                            )}
                        >
                            <option value="">
                                Select Overall Condition Class
                            </option>

                            <option value="Excellent">
                                Excellent
                            </option>

                            <option value="Very Good">
                                Very Good
                            </option>

                            <option value="Good">
                                Good
                            </option>

                            <option value="Fair">
                                Fair
                            </option>

                            <option value="Poor">
                                Poor
                            </option>
                        </select>
                    </div>

                    {/* Frame Condition */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Frame Condition
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                            {...register(
                                `lots.${lotIndex}.condition.frameCondition`
                            )}
                        >
                            <option value="">
                                Select Frame Condition
                            </option>

                            <option value="Excellent">
                                Excellent
                            </option>

                            <option value="Very Good">
                                Very Good
                            </option>

                            <option value="Good">
                                Good
                            </option>

                            <option value="Fair">
                                Fair
                            </option>

                            <option value="Poor">
                                Poor
                            </option>

                            <option value="Not Applicable">
                                Not Applicable
                            </option>
                        </select>
                    </div>
                </div>

                {/* Detailed Condition Notes */}
                <div className="grid grid-cols-1 gap-2 w-full mt-4">
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Detailed Condition Notes
                        </label>

                        <Input
                            type="text"
                            placeholder="Describe any micro, surface discoloration"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.condition.detailedConditionNotes`
                            )}
                        />
                    </div>
                </div>

                {/* Restoration History */}
                <div className="grid grid-cols-1 gap-2 w-full mt-4">
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Restoration & Conservation History
                        </label>

                        <Input
                            type="text"
                            placeholder="Provide Details of any conservation treatments"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.condition.restorationHistory`
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* ==================== PROVENANCE ==================== */}
            <div className="mt-10">
                <DashboardFormText text="Provenance & History" />

                <div className="grid grid-cols-3 gap-2 w-full">

                    {/* Previous Owner */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Previous Owner / collection
                        </label>

                        <Input
                            type="text"
                            placeholder="e.g. Private Collection, Mumbai"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.provenance.previousOwner`
                            )}
                        />
                    </div>

                    {/* Acquisition Method */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Acquisition Method
                        </label>

                        <select
                            className="w-full border rounded-md px-3 py-2"
                            {...register(
                                `lots.${lotIndex}.provenance.acquisitionMethod`
                            )}
                        >
                            <option value="">
                                Select Acquisition Method
                            </option>

                            <option value="PURCHASE">
                                Purchase
                            </option>

                            <option value="INHERITANCE">
                                Inheritance
                            </option>

                            <option value="GIFT">
                                Gift
                            </option>

                            <option value="AUCTION">
                                Auction
                            </option>

                            <option value="COMMISSION">
                                Commission
                            </option>

                            <option value="OTHER">
                                Other
                            </option>
                        </select>
                    </div>

                    {/* Acquisition Date */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Acquisition Date
                        </label>

                        <Controller
                            name={`lots.${lotIndex}.provenance.acquisitionDate`}
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    placeholder="Select acquisition date"
                                    className="w-95"
                                    value={
                                        field.value
                                            ? new Date(field.value)
                                            : undefined
                                    }
                                    onChange={(date) =>
                                        field.onChange(
                                            date
                                                ? date
                                                    .toISOString()
                                                    .split("T")[0]
                                                : ""
                                        )
                                    }
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Exhibition History */}
                <div className="grid grid-cols-1 gap-2 w-full mt-4">
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Exhibition History
                        </label>

                        <Input
                            type="text"
                            placeholder="List major exhibitions, museum displays"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.provenance.exhibitionHistory`
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* ==================== AUTHENTICATION ==================== */}
            <div className="mt-10 pb-10">
                <DashboardFormText text="Authentication Metadata" />

                <div className="grid grid-cols-2 gap-2 w-full">

                    {/* Authenticate By */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Authenticate By
                        </label>

                        <Input
                            type="text"
                            placeholder="Expert Name"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(
                                `lots.${lotIndex}.authentication.authenticatedBy`
                            )}
                        />
                    </div>

                    {/* Authenticate Date */}
                    <div className="input-wrapper">
                        <label className="block mb-2">
                            Authenticate Date
                        </label>

                        <Controller
                            name={`lots.${lotIndex}.authentication.authenticatedDate`}
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    placeholder="Select authentication date"
                                    className="w-xl"
                                    value={
                                        field.value
                                            ? new Date(field.value)
                                            : undefined
                                    }
                                    onChange={(date) =>
                                        field.onChange(
                                            date
                                                ? date
                                                    .toISOString()
                                                    .split("T")[0]
                                                : ""
                                        )
                                    }
                                />
                            )}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
