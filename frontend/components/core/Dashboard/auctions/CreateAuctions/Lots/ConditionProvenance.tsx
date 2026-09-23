"use client";

import { format } from "date-fns";
import { Controller, useFormContext } from "react-hook-form";

import DashboardFormText from "@/components/common/DashboardFormText";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import { Input } from "@/components/ui/input";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";

interface ConditionProvenanceProps {
    lotIndex: number;
}

// =====================================================================
// OPTIONS
// =====================================================================

const CONDITION_OPTIONS = ["Excellent", "Very Good", "Good", "Fair", "Poor"];

const FRAME_CONDITION_OPTIONS = [...CONDITION_OPTIONS, "Not Applicable"];

const ACQUISITION_METHODS = [
    { value: "PURCHASE", label: "Purchase" },
    { value: "INHERITANCE", label: "Inheritance" },
    { value: "GIFT", label: "Gift" },
    { value: "AUCTION", label: "Auction" },
    { value: "COMMISSION", label: "Commission" },
    { value: "OTHER", label: "Other" },
];

// =====================================================================
// DATE HELPERS
// Form stores plain "yyyy-MM-dd" strings. Parse/format in LOCAL time —
// toISOString() converts to UTC, which shifts the date back a day in IST.
// =====================================================================

const toPickerDate = (value?: string): Date | undefined =>
    value ? new Date(`${value}T00:00:00`) : undefined;

const toFormDate = (date?: Date | null): string =>
    date ? format(date, "yyyy-MM-dd") : "";

// =====================================================================
// COMPONENT
// =====================================================================

export default function ConditionProvenance({
    lotIndex,
}: ConditionProvenanceProps) {
    const { register, control } = useFormContext<AuctionFormData>();

    return (
        <div className="px-6">

            {/* ==================== CONDITION REPORT ==================== */}
            <div className="mt-10">
                <DashboardFormText text="Condition Report" />

                <div className="grid grid-cols-2 gap-2 w-full">

                    {/* Overall Condition */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Overall Condition Class</label>

                        <select
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.condition.overallCondition`)}
                        >
                            <option value="">Select Overall Condition Class</option>
                            {CONDITION_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Frame Condition */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Frame Condition</label>

                        <select
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.condition.frameCondition`)}
                        >
                            <option value="">Select Frame Condition</option>
                            {FRAME_CONDITION_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Detailed Condition Notes */}
                <div className="grid grid-cols-1 gap-2 w-full mt-4">
                    <div className="input-wrapper">
                        <label className="block mb-2">Detailed Condition Notes</label>

                        <textarea
                            rows={3}
                            placeholder="Describe any craquelure, surface discoloration, foxing, tears or losses"
                            className="w-full border rounded-md px-3 py-2"
                            {...register(`lots.${lotIndex}.condition.detailedConditionNotes`)}
                        />
                    </div>
                </div>

                {/* Restoration History */}
                <div className="grid grid-cols-1 gap-2 w-full mt-4">
                    <div className="input-wrapper">
                        <label className="block mb-2">Restoration & Conservation History</label>

                        <textarea
                            rows={3}
                            placeholder="Provide details of any conservation treatments (who, when, what was done)"
                            className="w-full border rounded-md px-3 py-2"
                            {...register(`lots.${lotIndex}.condition.restorationHistory`)}
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
                        <label className="block mb-2">Previous Owner / Collection</label>

                        <Input
                            type="text"
                            placeholder="e.g. Private Collection, Mumbai"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.provenance.previousOwner`)}
                        />
                    </div>

                    {/* Acquisition Method */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Acquisition Method</label>

                        <select
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.provenance.acquisitionMethod`)}
                        >
                            <option value="">Select Acquisition Method</option>
                            {ACQUISITION_METHODS.map((method) => (
                                <option key={method.value} value={method.value}>
                                    {method.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Acquisition Date */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Acquisition Date</label>

                        <Controller
                            name={`lots.${lotIndex}.provenance.acquisitionDate`}
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    placeholder="Select acquisition date"
                                    className="w-full"
                                    value={toPickerDate(field.value)}
                                    onChange={(date) => field.onChange(toFormDate(date))}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Exhibition History */}
                <div className="grid grid-cols-1 gap-2 w-full mt-4">
                    <div className="input-wrapper">
                        <label className="block mb-2">Exhibition History</label>

                        <textarea
                            rows={3}
                            placeholder="List major exhibitions and museum displays, one per line"
                            className="w-full border rounded-md px-3 py-2"
                            {...register(`lots.${lotIndex}.provenance.exhibitionHistory`)}
                        />
                    </div>
                </div>
            </div>

            {/* ==================== AUTHENTICATION ==================== */}
            <div className="mt-10 pb-10">
                <DashboardFormText text="Authentication Metadata" />

                <div className="grid grid-cols-2 gap-2 w-full">

                    {/* Authenticated By */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Authenticated By</label>

                        <Input
                            type="text"
                            placeholder="Expert or estate board name"
                            className="w-full border rounded-md px-3 py-2 h-11"
                            {...register(`lots.${lotIndex}.authentication.authenticatedBy`)}
                        />
                    </div>

                    {/* Authentication Date */}
                    <div className="input-wrapper">
                        <label className="block mb-2">Authentication Date</label>

                        <Controller
                            name={`lots.${lotIndex}.authentication.authenticatedDate`}
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    placeholder="Select authentication date"
                                    className="w-full"
                                    value={toPickerDate(field.value)}
                                    onChange={(date) => field.onChange(toFormDate(date))}
                                />
                            )}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}