"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { format } from "date-fns";

import DatePicker from "@/components/common/DatePicker/DatePicker";
import TimePicker from "@/components/common/DatePicker/TimePicker";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import { getLotScheduleError } from "@/utils/buildAuctionFormData";

interface LotScheduleProps {
    lotIndex: number;
}

// Form dates are "yyyy-MM-dd" — parse/format in LOCAL time
const toDate = (value?: string): Date | undefined =>
    value ? new Date(`${value}T00:00:00`) : undefined;

const toFormDate = (date?: Date): string =>
    date ? format(date, "yyyy-MM-dd") : "";

const formatDateTime = (date: string, time: string) =>
    format(new Date(`${date}T${time}:00`), "dd MMM yyyy, hh:mm a");

/** Later of two "HH:mm" values (either may be missing). */
const laterTime = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b);

/**
 * Lot bidding window. Dates outside the auction's start/end can't be
 * picked; times are bounded on the auction's first and last day.
 */
export default function LotSchedule({ lotIndex }: LotScheduleProps) {
    const { control, setValue, getValues } = useFormContext<AuctionFormData>();

    const auction = useWatch({ control, name: "schedule" });
    const lot = useWatch({ control, name: `lots.${lotIndex}.schedule` });

    const auctionReady = Boolean(
        auction?.startDate && auction?.startTime && auction?.endDate && auction?.endTime
    );
    const error = auctionReady ? getLotScheduleError(lot, auction) : null;

    const applyAuctionTiming = () => {
        setValue(
            `lots.${lotIndex}.schedule`,
            {
                startDate: auction.startDate,
                startTime: auction.startTime,
                endDate: auction.endDate,
                endTime: auction.endTime,
            },
            { shouldDirty: true }
        );
    };

    const auctionStart = toDate(auction?.startDate);
    const auctionEnd = toDate(auction?.endDate);

    // Time bounds apply only on the auction's first / last day
    const startTimeMin = lot?.startDate === auction?.startDate ? auction?.startTime : undefined;
    const startTimeMax = lot?.startDate === auction?.endDate ? auction?.endTime : undefined;
    const endTimeMin = laterTime(
        lot?.endDate === auction?.startDate ? auction?.startTime : undefined,
        lot?.endDate && lot.endDate === lot.startDate ? lot.startTime : undefined
    );
    const endTimeMax = lot?.endDate === auction?.endDate ? auction?.endTime : undefined;

    return (
        <div className="px-6 bg-[#f4f2f2] py-6 my-6 rounded-[8px]">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-[16px] font-bold">Lot Schedule</h1>

                {auctionReady && (
                    <button
                        type="button"
                        onClick={applyAuctionTiming}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                        Use auction timing
                    </button>
                )}
            </div>

            <p className={`mt-1 mb-4 text-xs ${auctionReady ? "text-slate-500" : "text-amber-600"}`}>
                {auctionReady
                    ? `Must fall within the auction: ${formatDateTime(auction.startDate, auction.startTime)} → ${formatDateTime(auction.endDate, auction.endTime)}`
                    : "Set the auction start and end in Step 2 (Schedule) first."}
            </p>

            <div className="grid grid-cols-2 gap-4">
                <div className="input-wrapper">
                    <label className="block mb-2">Lot Start Date</label>
                    <Controller
                        name={`lots.${lotIndex}.schedule.startDate`}
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                value={toDate(field.value)}
                                minDate={auctionStart}
                                maxDate={toDate(lot?.endDate) ?? auctionEnd}
                                defaultMonth={auctionStart}
                                disabled={!auctionReady}
                                onChange={(date) => {
                                    const next = toFormDate(date);
                                    field.onChange(next);
                                    // If the end date is now before the start, clear it
                                    const currentEnd = getValues(`lots.${lotIndex}.schedule.endDate`);
                                    if (next && currentEnd && currentEnd < next) {
                                        setValue(`lots.${lotIndex}.schedule.endDate`, "", { shouldDirty: true });
                                    }
                                }}
                                placeholder="Select the lot's start date"
                            />
                        )}
                    />
                </div>

                <div className="input-wrapper">
                    <label className="block mb-2">Lot Start Time</label>
                    <Controller
                        name={`lots.${lotIndex}.schedule.startTime`}
                        control={control}
                        render={({ field }) => (
                            <TimePicker
                                value={field.value}
                                onChange={field.onChange}
                                min={startTimeMin}
                                max={startTimeMax}
                                disabled={!auctionReady}
                            />
                        )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="input-wrapper">
                    <label className="block mb-2">Lot End Date</label>
                    <Controller
                        name={`lots.${lotIndex}.schedule.endDate`}
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                value={toDate(field.value)}
                                minDate={toDate(lot?.startDate) ?? auctionStart}
                                maxDate={auctionEnd}
                                defaultMonth={toDate(lot?.startDate) ?? auctionStart}
                                disabled={!auctionReady}
                                onChange={(date) => field.onChange(toFormDate(date))}
                                placeholder="Select the lot's end date"
                            />
                        )}
                    />
                </div>

                <div className="input-wrapper">
                    <label className="block mb-2">Lot End Time</label>
                    <Controller
                        name={`lots.${lotIndex}.schedule.endTime`}
                        control={control}
                        render={({ field }) => (
                            <TimePicker
                                value={field.value}
                                onChange={field.onChange}
                                min={endTimeMin}
                                max={endTimeMax}
                                disabled={!auctionReady}
                            />
                        )}
                    />
                </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}
