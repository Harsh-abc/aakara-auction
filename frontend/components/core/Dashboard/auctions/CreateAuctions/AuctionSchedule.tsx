
"use client";

import { Controller, useFormContext } from "react-hook-form";
import { format } from "date-fns";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import TimePicker from "@/components/common/DatePicker/TimePicker";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import DashboardFormText from "@/components/common/DashboardFormText";

export default function AuctionSchedule() {
    const [enabled, setEnabled] = useState(false);

    const {
        control,
        register,
    } = useFormContext<AuctionFormData>();

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-182.5 px-7 py-7 bg-dashboardFormBg rounded-[8px]">

                    <DashboardFormText text="Timeline & Schedule Settings" />

                    {/* Auction Start / End Date */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Start Date */}
                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Start Date
                            </label>

                            <Controller
                                name="schedule.startDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={
                                            field.value
                                                ? new Date(`${field.value}T00:00:00`)
                                                : undefined
                                        }
                                        onChange={(date) => {
                                            field.onChange(
                                                date
                                                    ? format(date, "yyyy-MM-dd")
                                                    : ""
                                            );
                                        }}
                                        placeholder="Select the auction's start date"
                                        className="w-93.5"
                                    />
                                )}
                            />
                        </div>

                        {/* End Date */}
                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction End Date
                            </label>

                            <Controller
                                name="schedule.endDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={
                                            field.value
                                                ? new Date(`${field.value}T00:00:00`)
                                                : undefined
                                        }
                                        onChange={(date) => {
                                            field.onChange(
                                                date
                                                    ? format(date, "yyyy-MM-dd")
                                                    : ""
                                            );
                                        }}
                                        placeholder="Select the auction's end date"
                                        className="w-93.5"
                                    />
                                )}
                            />
                        </div>

                    </div>

                    {/* Auction Start / End Time */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Start Time */}
                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Start Time
                            </label>

                            <Controller
                                name="schedule.startTime"
                                control={control}
                                render={({ field }) => (
                                    <TimePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </div>

                        {/* End Time */}
                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction End Time
                            </label>

                            <Controller
                                name="schedule.endTime"
                                control={control}
                                render={({ field }) => (
                                    <TimePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </div>

                    </div>

                    {/* Timezone */}
                    <div className="grid grid-cols-1 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Time Zone
                            </label>

                            <Input
                                type="text"
                                placeholder="Choose Your Campaign Zone time"
                                className="w-full border rounded-md px-3 py-2 h-11"
                                {...register("schedule.timezone")}
                            />
                        </div>

                    </div>

                    {/* Registration Dates */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Registration Start */}
                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Registration Start Date
                            </label>

                            <Controller
                                name="schedule.registrationStarts"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={
                                            field.value
                                                ? new Date(`${field.value}T00:00:00`)
                                                : undefined
                                        }
                                        onChange={(date) => {
                                            field.onChange(
                                                date
                                                    ? format(date, "yyyy-MM-dd")
                                                    : ""
                                            );
                                        }}
                                        placeholder="Select registration start date"
                                        className="w-93.5"
                                    />
                                )}
                            />
                        </div>

                        {/* Registration Deadline */}
                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Registration Deadline
                            </label>

                            <Controller
                                name="schedule.registrationDeadline"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={
                                            field.value
                                                ? new Date(`${field.value}T00:00:00`)
                                                : undefined
                                        }
                                        onChange={(date) => {
                                            field.onChange(
                                                date
                                                    ? format(date, "yyyy-MM-dd")
                                                    : ""
                                            );
                                        }}
                                        placeholder="Select registration deadline"
                                        className="w-93.5"
                                    />
                                )}
                            />
                        </div>

                    </div>

                    {/* Preview Start */}
                    <div className="grid grid-cols-1 gap-4 mt-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Preview Start Date
                            </label>

                            <Controller
                                name="schedule.previewStartAt"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={
                                            field.value
                                                ? new Date(`${field.value}T00:00:00`)
                                                : undefined
                                        }
                                        onChange={(date) => {
                                            field.onChange(
                                                date
                                                    ? format(date, "yyyy-MM-dd")
                                                    : ""
                                            );
                                        }}
                                        placeholder="Select preview start date"
                                        className="w-full"
                                    />
                                )}
                            />
                        </div>

                    </div>

                    {/* Extended Bidding */}
                    <div className="p-4 bg-[#EFE2E9] mt-8 rounded-[8px]">

                        <div className="flex items-center justify-between">

                            <p className="text-sm font-bold">
                                Allow Extended Bidding
                            </p>

                            <button
                                type="button"
                                onClick={() => setEnabled(!enabled)}
                                className={`relative flex h-[18px] w-[30px] items-center rounded-full transition-colors cursor-pointer duration-200 ${enabled
                                        ? "bg-[#7A3D5E]"
                                        : "bg-[#d1d5db]"
                                    }`}
                                aria-pressed={enabled}
                            >
                                <span
                                    className={`absolute h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled
                                            ? "translate-x-[14px]"
                                            : "translate-x-[2px]"
                                        }`}
                                />
                            </button>

                        </div>

                        <div className="py-3">

                            <p className="text-[13px] font-bold pb-1.5">
                                Extension Duration
                            </p>

                            <Input
                                type="number"
                                placeholder="eg. 5 minutes"
                                className="w-full bg-white rounded-md px-3 py-2 h-11"
                                disabled={!enabled}
                                {...register(
                                    "schedule.auctionExtensionTime",
                                    {
                                        valueAsNumber: true,
                                    }
                                )}
                            />

                            <span className="text-[13px] font-normal">
                                *Bids in the last 2 minutes extend the auction
                                by 5 minutes to prevent sniping.
                            </span>

                        </div>

                    </div>

                </div>

                {/* Auction Duration Preview */}
                <div className="flex-1 w-93">

                    <div className="w-full max-w-[405px] rounded-lg border border-slate-200 bg-white p-6">

                        <div className="text-center">

                            <h3 className="text-[13px] font-semibold">
                                Total Auction Duration
                            </h3>

                            <div className="mt-5">

                                <h2 className="text-[32px] font-bold leading-none text-[#7A3D5E]">
                                    3 Days 08 Hours
                                </h2>

                                <p className="mt-3 text-[12px] text-[#475569]">
                                    80 Total hours of active bidding
                                </p>

                            </div>

                        </div>

                        <div className="my-5 border-t border-slate-200" />

                        <div className="space-y-3">

                            <div className="flex items-center justify-between">
                                <span className="text-[13px] text-[#475569]">
                                    Bidding Starts
                                </span>

                                <span className="text-[13px] font-semibold text-[#475569]">
                                    Oct 12, 10:00 AM
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[13px] text-[#475569]">
                                    Bidding Ends
                                </span>

                                <span className="text-[13px] font-semibold text-[#475569]">
                                    Oct 15, 06:00 PM
                                </span>
                            </div>

                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}