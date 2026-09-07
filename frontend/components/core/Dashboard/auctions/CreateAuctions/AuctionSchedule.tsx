"use client";

import { useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import TimePicker from "@/components/common/DatePicker/TimePicker";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import DashboardFormText from "@/components/common/DashboardFormText";

export default function AuctionSchedule() {

    const [enabled, setEnabled] = useState(false);

    const {
        register,
    } = useFormContext<AuctionFormData>();

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-182.5 px-7 py-7 bg-dashboardFormBg rounded-[8px]">

                    <DashboardFormText text="Timeline & Schedule Settings" />

                    <div className="grid grid-cols-2 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Start Date
                            </label>

                            <DatePicker placeholder="Select the auction's start date" className="w-93.5" />
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Start End
                            </label>

                            <DatePicker placeholder="Select the auction's start end" className="w-93.5" />
                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Start Date
                            </label>

                            <TimePicker />
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Start End
                            </label>

                            <TimePicker />
                        </div>

                    </div>

                    <div className="grid grid-cols-1 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Time Zone
                            </label>

                            <Input
                                type="text"
                                placeholder="Choose Your Campaign Zone time"
                                className="w-full border rounded-md px-3 py-2 h-11"
                            />
                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Registration Start Date
                            </label>

                            <DatePicker placeholder="Select the auction's start date" className="w-93.5" />
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Registration Start End
                            </label>

                            <DatePicker placeholder="Select the auction's start end" className="w-93.5" />
                        </div>

                    </div>

                    <div className="p-4 bg-[#EFE2E9] mt-8 rounded-[8px]">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold">Allow Extended Bidding</p>
                            <button
                                type="button"
                                onClick={() => setEnabled(!enabled)}
                                className={`relative flex h-[18px] w-[30px] items-center rounded-full transition-colors cursor-pointer duration-200 ${enabled ? "bg-[#7A3D5E]" : "bg-[#d1d5db]"
                                    }`}
                                aria-pressed={enabled}
                            >
                                <span
                                    className={`absolute h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-[14px]" : "translate-x-[2px]"
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="py-3">
                            <p className="text-[13px] font-bold pb-1.5">Extension Duration</p>
                            <Input
                                type="text"
                                placeholder="eg. 5 minutes"
                                className="w-full bg-white rounded-md px-3 py-2 h-11"
                            />

                            <span className="text-[13px] font-normal">*Bids in the last 2 minutes extend the auctionby 5 minutes to prevent sniping.</span>
                        </div>
                    </div>

                </div>
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