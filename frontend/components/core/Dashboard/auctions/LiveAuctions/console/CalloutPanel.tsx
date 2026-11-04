"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Loader2, Megaphone, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/apiError";
import type { ConsoleLot, ConsolePosition, LotCallout } from "@/lib/types/bidding.types";
import { cn } from "@/lib/utils";
import { sendLotCallout } from "@/services/operations/bidding.api";

import { money } from "./consoleDisplay";

/** Matches lotCalloutSchema in backend/src/validations/bidding.validation.js */
const MAX_LENGTH = 160;
/** Sent callouts kept under the box */
const RECENT_LIMIT = 3;

type CalloutGroup = { label: string; lines: string[] };

/**
 * The lines an auctioneer says from the rostrum, worded for where the lot stands
 * and grouped by the moment they're for. Only the paddle is named — bidders' names
 * stay on the console.
 */
const calloutGroups = (lot: ConsoleLot, position: ConsolePosition, code: string): CalloutGroup[] => {
    const nextBid = money(position.nextBid, code);

    if (position.currentBid === null) {
        return [
            {
                label: "Opening",
                lines: [
                    `Lot #${lot.itemNumber} is now open — who'll start me at ${nextBid}?`,
                    `Opening bid ${nextBid}. Any bidder?`,
                    "Bidding is open online and in the room",
                ],
            },
            {
                label: "Encourage",
                lines: ["Don't be shy — this one won't wait", "A fine piece — who'll get us started?", "Last chance to open the bidding on this lot"],
            },
        ];
    }

    const current = money(position.currentBid, code);
    const leader = position.leader;
    const paddle = leader?.paddle ? `Paddle #${leader.paddle}` : null;
    const where =
        leader?.source === "FLOOR" ? "The bid is in the room" : leader?.source === "PROXY" ? "The bid is with a proxy" : "The bid is online";

    return [
        {
            label: "Asking",
            lines: [
                `Next bid ${nextBid}`,
                `${current}${paddle ? ` with ${paddle}` : ""} — do I hear ${nextBid}?`,
                `Any advance on ${current}?`,
                `${where} at ${current}`,
            ],
        },
        {
            label: "Encourage",
            lines: [
                "Fresh bidder — welcome!",
                "Thank you — keep them coming",
                "Take your time, but not too much",
                position.reserveMet ? "The reserve has been met — this lot will sell" : "We're still below the reserve",
            ],
        },
        {
            label: "Closing",
            lines: [
                `Fair warning — selling at ${current}`,
                "Going once…",
                "Going twice…",
                "Last call — bid now or lose it",
                ...(paddle ? [`All done? Selling to ${paddle} at ${current}`] : []),
            ],
        },
    ];
};

interface CalloutPanelProps {
    lot: ConsoleLot;
    position: ConsolePosition;
    code: string;
    token: string | null;
    /** bidding is paused: nothing can be sent */
    disabled: boolean;
}

// Callouts to everyone watching the sale: one click on a preset, or the auctioneer's own words
export default function CalloutPanel({ lot, position, code, token, disabled }: CalloutPanelProps) {
    const [text, setText] = useState("");
    const [sending, setSending] = useState<string | null>(null);
    const [recent, setRecent] = useState<LotCallout[]>([]);

    const send = async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed || sending) return;
        setSending(trimmed);
        try {
            const callout = await sendLotCallout(lot.uuid, trimmed, token);
            setRecent((prev) => [callout, ...prev].slice(0, RECENT_LIMIT));
            if (trimmed === text.trim()) setText("");
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't send the message"));
        } finally {
            setSending(null);
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        send(text);
    };

    // a callout sent for an earlier lot doesn't belong under this one
    const sentHere = recent.filter((callout) => callout.lotUuid === lot.uuid);

    return (
        <section className="flex flex-col rounded-[8px] bg-[#F4F4F4] p-3">
            <div className="px-1 pb-3">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#414141]">
                    <Megaphone className="h-3.5 w-3.5" />
                    Auctioneer Callouts
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">Shown to everyone watching the sale</p>
            </div>

            <div className="space-y-3 rounded-[6px] bg-white p-3">
                {calloutGroups(lot, position, code).map((group) => (
                    <div key={group.label}>
                        <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-[#777777] uppercase">{group.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {group.lines.map((line) => (
                                <button
                                    key={line}
                                    type="button"
                                    disabled={disabled || sending !== null}
                                    onClick={() => send(line)}
                                    className={cn(
                                        "flex items-center gap-1 rounded-full border border-[#D9D9D9] bg-white px-2.5 py-1 text-left text-[11px] leading-snug text-[#414141] transition-colors",
                                        "cursor-pointer hover:border-[#7A3D5E] hover:bg-[#F8F0F4] disabled:cursor-not-allowed disabled:opacity-50"
                                    )}
                                >
                                    {sending === line && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
                                    {line}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                <form onSubmit={submit} className="border-t border-[#F0F0F0] pt-3">
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-[#777777] uppercase">Your own words</p>
                    <div className="flex gap-1.5">
                        <input
                            type="text"
                            value={text}
                            maxLength={MAX_LENGTH}
                            disabled={disabled}
                            onChange={(event) => setText(event.target.value)}
                            placeholder="Message to the room…"
                            className="h-8 min-w-0 flex-1 rounded-[6px] border border-[#D9D9D9] px-2.5 text-[12px] text-[#414141] outline-none focus:border-[#7A3D5E] disabled:bg-slate-50"
                        />
                        <Button
                            type="submit"
                            aria-label="Send"
                            className="h-8 w-8 shrink-0 rounded-[6px] bg-[#7A3D5E] p-0 text-white hover:bg-[#7A3D5E]/90"
                            disabled={disabled || !text.trim() || sending !== null}
                        >
                            {sending !== null && sending === text.trim() ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                </form>

                {sentHere.length > 0 && (
                    <div className="border-t border-[#F0F0F0] pt-2">
                        <p className="mb-1 text-[10px] font-semibold tracking-wide text-[#777777] uppercase">Sent</p>
                        <ol className="space-y-1">
                            {sentHere.map((callout) => (
                                <li key={callout.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                                    <span className="truncate text-[#555555]" title={callout.message}>
                                        {callout.message}
                                    </span>
                                    <span className="shrink-0 text-[#999999] tabular-nums">
                                        {new Date(callout.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </section>
    );
}
