"use client"

import { useState } from "react"
import { WifiLow, WifiOff, X } from "lucide-react"

import { useNetworkHealth, type NetReason } from "@/hooks/useNetworkHealth"
import { cn } from "@/lib/utils"

type Audience = "bidder" | "host" | "staff"

// "about 3 seconds"
const lateBy = (ms: number | null) => {
    const seconds = Math.max(2, Math.round((ms ?? 0) / 1000))
    return `about ${seconds} seconds`
}

const SWITCH = "Switch to a different network (for example from Wi-Fi to mobile data, or the other way round)"

const MESSAGES: Record<Audience, { offline: string; weak: (reason: NetReason, delayMs: number | null) => string }> = {
    bidder: {
        offline: "You're offline. Bidding and the live video will resume once your connection is back.",
        weak: (reason, delayMs) =>
            reason === "bids"
                ? `Your internet speed is slow: bids are reaching you ${lateBy(delayMs)} late. ${SWITCH} so you don't miss your chance to bid.`
                : reason === "video"
                  ? "Your internet speed is slow. The live video may freeze or look blurry. Switch to a faster network (at least 3 Mbps, such as 4G or home Wi-Fi) for a smooth auction."
                  : `Your internet connection is slow. New bids and the auctioneer's messages may reach you late. ${SWITCH}.`,
    },
    host: {
        offline: "You're offline. The stream isn't reaching bidders. Reconnect to keep broadcasting.",
        weak: (reason, delayMs) =>
            reason === "bids"
                ? `Your internet speed is slow: bids are reaching you ${lateBy(delayMs)} late. ${SWITCH}, ideally a wired connection.`
                : "Your upload connection is weak. Bidders may see a frozen or blurry stream. Switch to a wired connection or a faster network (30 Mbps upload or more recommended), or lower the stream quality.",
    },
    staff: {
        offline: "You're offline. The console will catch up once your connection is back.",
        weak: (reason, delayMs) =>
            reason === "bids"
                ? `Your internet speed is slow: bids are reaching the console ${lateBy(delayMs)} late. ${SWITCH} before taking phone bids.`
                : `Your internet speed is slow. Bids may reach the console late, and bids you enter may take longer to go through. ${SWITCH} before taking phone bids.`,
    },
}

/** A message at the top of a live page while this tab's connection is too weak for the auction. */
export function NetworkBanner({ audience, className }: { audience: Audience; className?: string }) {
    const { level, reason, bidDelayMs } = useNetworkHealth({ upload: audience === "host" })

    // dismissed until the connection recovers; a later weak spell shows it again
    const [dismissed, setDismissed] = useState(false)
    const [seenLevel, setSeenLevel] = useState(level)
    if (seenLevel !== level) {
        setSeenLevel(level)
        if (level === "good") setDismissed(false)
    }

    if (level === "good" || (dismissed && level === "poor")) return null

    const offline = level === "offline"
    const Icon = offline ? WifiOff : WifiLow

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex items-start gap-3 border px-4 py-3 text-[13px] leading-5 animate-in fade-in-0 slide-in-from-top-1 duration-300",
                offline ? "border-red-300 bg-red-50 text-red-700" : "border-[#d0a55d] bg-[#fdedd6] text-[#0d0d0d]",
                className
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1">{offline ? MESSAGES[audience].offline : MESSAGES[audience].weak(reason, bidDelayMs)}</p>
            {/* being offline can't be waved away, it affects every bid */}
            {!offline && (
                <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 cursor-pointer opacity-60 hover:opacity-100">
                    <X className="size-4" />
                </button>
            )}
        </div>
    )
}
