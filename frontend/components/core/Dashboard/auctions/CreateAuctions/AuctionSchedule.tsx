"use client";

import { useFormContext } from "react-hook-form";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import TimePicker from "@/components/common/DatePicker/TimePicker";
import { Input } from "@/components/ui/input";

export default function AuctionSchedule() {



    const {
        register,
    } = useFormContext<AuctionFormData>();

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-182.5 px-7 py-7 bg-dashboardFormBg rounded-[8px]">
                    <div className="">
                        <h1 className="text-[18px] font-bold">Timeline & Schedule Settings</h1>
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Start Date
                            </label>

                            <DatePicker placeholder="Select the auction's start date" className="w-93.5"/>
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Auction Start End
                            </label>

                            <DatePicker placeholder="Select the auction's start end" className="w-93.5"/>
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
                                {...register("basicInfo.reference")}
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

                            <DatePicker placeholder="Select the auction's start date" className="w-93.5"/>
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">
                                Registration Start End
                            </label>

                            <DatePicker placeholder="Select the auction's start end" className="w-93.5"/>
                        </div>

                    </div>

                </div>
                <div className="flex-1 w-93">
                    <div className="flex items-start gap-4 pb-10 border rounded-[8px] h-100 bg-dashboardFormBg">
                        <h1 className="text-[18px] font-bold flex items-center justify-center text-center">
                            Auction Image
                        </h1>
                    </div>
                </div>
            </div>


        </div>
    );
}