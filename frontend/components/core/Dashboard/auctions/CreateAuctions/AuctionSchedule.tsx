"use client";

import { useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { format, differenceInMinutes } from "date-fns";

import { AuctionFormData } from "@/lib/types/AuctionsFormData";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import TimePicker from "@/components/common/DatePicker/TimePicker";
import { Input } from "@/components/ui/input";
import DashboardFormText from "@/components/common/DashboardFormText";

// ---------------------------------------------------------------------
// Date helpers: the form stores "yyyy-MM-dd"; parse/format in LOCAL time
// ---------------------------------------------------------------------

const toDate = (value?: string): Date | undefined =>
    value ? new Date(`${value}T00:00:00`) : undefined;

const toFormDate = (date?: Date): string =>
    date ? format(date, "yyyy-MM-dd") : "";

const combine = (date?: string, time?: string): Date | null => {
    if (!date || !time) return null;
    const d = new Date(`${date}T${time}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
};

export default function AuctionSchedule() {
    const {
        control,
        register,
        watch,
        setValue,
        getValues,
    } = useFormContext<AuctionFormData>();

    const today = useMemo(() => new Date(), []);

    const startDate = watch("schedule.startDate");
    const startTime = watch("schedule.startTime");
    const endDate = watch("schedule.endDate");
    const endTime = watch("schedule.endTime");
    const registrationStarts = watch("schedule.registrationStarts");

    // Keep the toggle in sync with the form when revisiting the step
    const [extensionEnabled, setExtensionEnabled] = useState(
        () => getValues("schedule.auctionExtensionTime") != null
    );

    // ---------------- live duration preview ----------------
    const start = combine(startDate, startTime);
    const end = combine(endDate, endTime);

    const duration = useMemo(() => {
        if (!start || !end) return null;
        const minutes = differenceInMinutes(end, start);
        if (minutes <= 0) return { invalid: true as const };
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;
        return {
            invalid: false as const,
            label: `${days} Day${days === 1 ? "" : "s"} ${String(hours).padStart(2, "0")} Hours${mins ? ` ${mins} Min` : ""}`,
            totalHours: Math.round(minutes / 60),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, startTime, endDate, endTime]);

    const sameDay = startDate && endDate && startDate === endDate;

    return (
        <div className="space-y-60">
            <div className="flex items-start justify-between gap-4 pb-10">
                <div className="flex-2 w-182.5 px-7 py-7 bg-dashboardFormBg rounded-[8px]">

                    <DashboardFormText text="Timeline & Schedule Settings" />

                    {/* ================= START / END DATE ================= */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Auction Start Date</label>
                            <Controller
                                name="schedule.startDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={toDate(field.value)}
                                        minDate={today}
                                        onChange={(date) => {
                                            const next = toFormDate(date);
                                            field.onChange(next);
                                            // If the end date is now before the start, clear it
                                            const currentEnd = getValues("schedule.endDate");
                                            if (next && currentEnd && currentEnd < next) {
                                                setValue("schedule.endDate", "", { shouldDirty: true });
                                            }
                                        }}
                                        placeholder="Select the auction's start date"
                                    />
                                )}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">Auction End Date</label>
                            <Controller
                                name="schedule.endDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={toDate(field.value)}
                                        minDate={toDate(startDate) ?? today}
                                        defaultMonth={toDate(startDate)}
                                        disabled={!startDate}
                                        onChange={(date) => field.onChange(toFormDate(date))}
                                        placeholder={startDate ? "Select the auction's end date" : "Pick a start date first"}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* ================= START / END TIME ================= */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Auction Start Time</label>
                            <Controller
                                name="schedule.startTime"
                                control={control}
                                render={({ field }) => (
                                    <TimePicker value={field.value} onChange={field.onChange} />
                                )}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">Auction End Time</label>
                            <Controller
                                name="schedule.endTime"
                                control={control}
                                render={({ field }) => (
                                    <TimePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        min={sameDay ? startTime : undefined}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {duration?.invalid && (
                        <p className="-mt-2 mb-4 text-sm text-red-500">
                            End date &amp; time must be after the start.
                        </p>
                    )}

                    {/* ================= TIMEZONE ================= */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Time Zone</label>
                            <select
                                className="w-full border rounded-md px-3 py-2 h-11"
                                {...register("schedule.timezone")}
                            >
                                <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                                <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                                <option value="Europe/London">Europe/London</option>
                                <option value="America/New_York">America/New_York</option>
                                <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                            </select>
                            <p className="mt-1 text-xs text-slate-500">
                                Times above are entered in your computer&apos;s local time.
                            </p>
                        </div>
                    </div>

                    {/* ================= REGISTRATION ================= */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Registration Start Date</label>
                            <Controller
                                name="schedule.registrationStarts"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={toDate(field.value)}
                                        minDate={today}
                                        maxDate={toDate(startDate)}
                                        onChange={(date) => field.onChange(toFormDate(date))}
                                        placeholder="Select registration start date"
                                    />
                                )}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="block mb-2">Registration Deadline</label>
                            <Controller
                                name="schedule.registrationDeadline"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={toDate(field.value)}
                                        minDate={toDate(registrationStarts) ?? today}
                                        maxDate={toDate(startDate)}
                                        defaultMonth={toDate(registrationStarts) ?? toDate(startDate)}
                                        onChange={(date) => field.onChange(toFormDate(date))}
                                        placeholder="Select registration deadline"
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* ================= PREVIEW ================= */}
                    <div className="grid grid-cols-1 gap-4 mt-4">
                        <div className="input-wrapper">
                            <label className="block mb-2">Preview Start Date</label>
                            <Controller
                                name="schedule.previewStartAt"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={toDate(field.value)}
                                        minDate={today}
                                        maxDate={toDate(startDate)}
                                        onChange={(date) => field.onChange(toFormDate(date))}
                                        placeholder="Select preview start date"
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* ================= EXTENDED BIDDING ================= */}
                    <div className="p-4 bg-[#EFE2E9] mt-8 rounded-[8px]">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold">Allow Extended Bidding</p>

                            <button
                                type="button"
                                onClick={() => {
                                    const next = !extensionEnabled;
                                    setExtensionEnabled(next);
                                    setValue("schedule.auctionExtensionTime", next ? 5 : null, {
                                        shouldDirty: true,
                                    });
                                }}
                                className={`relative flex h-[18px] w-[30px] items-center rounded-full transition-colors cursor-pointer duration-200 ${extensionEnabled ? "bg-[#7A3D5E]" : "bg-[#d1d5db]"
                                    }`}
                                aria-pressed={extensionEnabled}
                                aria-label="Toggle extended bidding"
                            >
                                <span
                                    className={`absolute h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${extensionEnabled ? "translate-x-[14px]" : "translate-x-[2px]"
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="py-3">
                            <p className="text-[13px] font-bold pb-1.5">Extension Duration (minutes)</p>

                            <Input
                                type="number"
                                min={1}
                                placeholder="eg. 5"
                                className="w-full bg-white rounded-md px-3 py-2 h-11"
                                disabled={!extensionEnabled}
                                {...register("schedule.auctionExtensionTime", {
                                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                                })}
                            />

                            <span className="text-[13px] font-normal">
                                *Bids in the last 2 minutes extend the auction by this many minutes to prevent sniping.
                            </span>
                        </div>
                    </div>
                </div>

                {/* ================= DURATION PREVIEW ================= */}
                <div className="flex-1 w-93">
                    <div className="w-full max-w-[405px] rounded-lg border border-slate-200 bg-white p-6">
                        <div className="text-center">
                            <h3 className="text-[13px] font-semibold">Total Auction Duration</h3>

                            <div className="mt-5">
                                {duration && !duration.invalid ? (
                                    <>
                                        <h2 className="text-[32px] font-bold leading-none text-[#7A3D5E]">
                                            {duration.label}
                                        </h2>
                                        <p className="mt-3 text-[12px] text-[#475569]">
                                            {duration.totalHours} total hours of active bidding
                                        </p>
                                    </>
                                ) : (
                                    <p className={`text-sm ${duration?.invalid ? "text-red-500" : "text-slate-400"}`}>
                                        {duration?.invalid
                                            ? "End is before start"
                                            : "Set start and end date & time"}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="my-5 border-t border-slate-200" />

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] text-[#475569]">Bidding Starts</span>
                                <span className="text-[13px] font-semibold text-[#475569]">
                                    {start ? format(start, "MMM d, hh:mm a") : "—"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[13px] text-[#475569]">Bidding Ends</span>
                                <span className="text-[13px] font-semibold text-[#475569]">
                                    {end ? format(end, "MMM d, hh:mm a") : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}