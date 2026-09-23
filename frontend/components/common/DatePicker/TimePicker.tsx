"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimePickerProps {
    /** Always "HH:mm" in 24-hour format (what <input type="time"> produces). */
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    className?: string;

    /** Minimum time "HH:mm" (e.g. end time on the same day as the start). */
    min?: string;

    /** Show a readable "10:00 AM (morning)" hint under the input. */
    showHint?: boolean;
}

/**
 * The browser shows 12-hour AM/PM in Indian locales but stores 24-hour.
 * A common mistake is typing "12:30" and leaving AM, which is 00:30 (past midnight).
 * The hint makes the actual stored time obvious.
 */
const describeTime = (value: string): string | null => {
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;

    const h = Number(match[1]);
    const m = match[2];
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const meridiem = h < 12 ? "AM" : "PM";

    const period =
        h === 0 ? "midnight"
            : h < 5 ? "night"
                : h < 12 ? "morning"
                    : h === 12 ? "noon"
                        : h < 17 ? "afternoon"
                            : h < 21 ? "evening"
                                : "night";

    return `${h12}:${m} ${meridiem} (${period})`;
};

export default function TimePicker({
    value = "",
    onChange,
    disabled = false,
    className,
    min,
    showHint = true,
}: TimePickerProps) {
    const hint = value ? describeTime(value) : null;
    // 00:00–04:59 is almost always an AM/PM slip for an auction
    const isLateNight = /^0[0-4]:/.test(value);

    return (
        <div>
            <Input
                type="time"
                value={value}
                min={min}
                step={60}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn("h-11", className)}
            />

            {showHint && hint && (
                <p className={cn("mt-1 text-xs", isLateNight ? "text-amber-600" : "text-slate-500")}>
                    {hint}
                    {isLateNight && " — did you mean PM?"}
                </p>
            )}
        </div>
    );
}