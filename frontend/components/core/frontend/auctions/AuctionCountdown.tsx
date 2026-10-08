"use client"

import { useSyncExternalStore } from "react"

import { cn } from "@/lib/utils"

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const pad = (value: number) => String(value).padStart(2, "0")

function splitDuration(ms: number) {
    return [
        { value: Math.floor(ms / DAY), unit: "Days" },
        { value: Math.floor((ms % DAY) / HOUR), unit: "Hrs" },
        { value: Math.floor((ms % HOUR) / MINUTE), unit: "Mins" },
        { value: Math.floor((ms % MINUTE) / SECOND), unit: "Secs" },
    ]
}

type AuctionCountdownProps = {
    label: string
    target: string
    className?: string
}

// one shared 1s clock for every countdown on the page
let clockNow = Date.now()
const clockListeners = new Set<() => void>()
let clockTimer: number | undefined

function subscribeClock(listener: () => void) {
    clockListeners.add(listener)
    if (clockTimer === undefined) {
        clockNow = Date.now()
        clockTimer = window.setInterval(() => {
            clockNow = Date.now()
            clockListeners.forEach((notify) => notify())
        }, SECOND)
    }
    return () => {
        clockListeners.delete(listener)
        if (clockListeners.size === 0) {
            window.clearInterval(clockTimer)
            clockTimer = undefined
        }
    }
}

export function AuctionCountdown({ label, target, className }: AuctionCountdownProps) {
    // null on the server, so server and first client render agree
    const now = useSyncExternalStore<number | null>(subscribeClock, () => clockNow, () => null)

    const remaining = now === null ? null : Math.max(0, new Date(target).getTime() - now)

    return (
        <div className={cn("flex items-center gap-4", className)}>
            <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</span>
            <div className="flex items-start gap-1.5" aria-live="off">
                {(remaining === null ? splitDuration(0) : splitDuration(remaining)).map(({ value, unit }, index) => (
                    <div key={unit} className="flex items-start gap-1.5">
                        {index > 0 && <span className="text-lg leading-6 text-neutral-400">:</span>}
                        <div className="flex min-w-8 flex-col items-center">
                            <span className="text-lg leading-6 font-medium tabular-nums text-neutral-950">
                                {remaining === null ? "--" : pad(value)}
                            </span>
                            <span className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-neutral-500">{unit}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
