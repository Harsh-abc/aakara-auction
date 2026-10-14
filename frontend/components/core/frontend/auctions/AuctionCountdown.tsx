"use client";

import { useSyncExternalStore } from "react";

import { onServerClockSync, serverNow } from "@/lib/serverClock";
import { cn } from "@/lib/utils";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (value: number) => String(value).padStart(2, "0");

function splitDuration(ms: number) {
    return [
        { value: Math.floor(ms / DAY), unit: "Days" },
        { value: Math.floor((ms % DAY) / HOUR), unit: "Hrs" },
        { value: Math.floor((ms % HOUR) / MINUTE), unit: "Mins" },
        { value: Math.floor((ms % MINUTE) / SECOND), unit: "Secs" },
    ];
}

type AuctionCountdownProps = {
    label: string;
    target: string;
    className?: string;
};

// one shared 1s clock for every countdown on the page, on the server's time
// (not the visitor's system clock) so every machine counts down to the same moment
let clockNow = Date.now();
const clockListeners = new Set<() => void>();
let clockTimer: number | undefined;
let stopSyncListener: (() => void) | undefined;

const tick = () => {
    clockNow = serverNow();
    clockListeners.forEach((notify) => notify());
};

function subscribeClock(listener: () => void) {
    clockListeners.add(listener);
    if (clockTimer === undefined) {
        clockNow = serverNow();
        clockTimer = window.setInterval(tick, SECOND);
        stopSyncListener = onServerClockSync(tick);
    }
    return () => {
        clockListeners.delete(listener);
        if (clockListeners.size === 0) {
            window.clearInterval(clockTimer);
            clockTimer = undefined;
            stopSyncListener?.();
            stopSyncListener = undefined;
        }
    };
}

// LIVE IN   65 : 13 : 46 : 57   (Figma countdown — 18px figures over 9px units)
export function AuctionCountdown({ label, target, className }: AuctionCountdownProps) {
    // null on the server, so server and first client render agree
    const now = useSyncExternalStore<number | null>(subscribeClock, () => clockNow, () => null);

    const remaining = now === null ? null : Math.max(0, new Date(target).getTime() - now);

    return (
        <div className={cn("flex items-start gap-4", className)}>
            <span className="pt-0.5 text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">{label}</span>
            <div className="flex items-start gap-1.25" aria-live="off">
                {(remaining === null ? splitDuration(0) : splitDuration(remaining)).map(({ value, unit }, index) => (
                    <div key={unit} className="flex items-start gap-1.25">
                        {index > 0 && <span className="text-[18px] leading-3.5 text-[#717171]">:</span>}
                        <div className="flex min-w-8 flex-col items-center">
                            <span className="text-[18px] leading-3.5 font-medium text-[#0d0d0d] tabular-nums">{remaining === null ? "--" : pad(value)}</span>
                            <span className="mt-1.25 text-[9px] leading-[13.5px] tracking-[0.1em] text-[#717171] uppercase">{unit}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
