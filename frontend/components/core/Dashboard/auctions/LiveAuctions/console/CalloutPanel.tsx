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
/** Sent callouts remembered (the last one for the live lot shows under the box) */
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
    const [tab, setTab] = useState<string | null>(null);

    const groups = calloutGroups(lot, position, code);
    // the picked tab, unless the lot moved on and it's gone (e.g. "Opening" once bids are in)
    const active = groups.find((group) => group.label === tab) ?? groups[0];

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

    // the last line sent for this lot (one sent for an earlier lot doesn't belong here)
    const lastSent = recent.find((callout) => callout.lotUuid === lot.uuid) ?? null;

    return (
        <section className="flex shrink-0 flex-col rounded-[8px] bg-[#F4F4F4] p-3">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#414141]">
                    <Megaphone className="h-3.5 w-3.5" />
                    Auctioneer Callouts
                </p>
                <span className="text-[10px] text-slate-500">To everyone watching</span>
            </div>

            <div className="rounded-[6px] bg-white p-2.5">
                {/* one moment of the lot at a time keeps the panel short */}
                <div role="tablist" className="flex gap-1 rounded-[6px] bg-[#F4F4F4] p-0.5">
                    {groups.map((group) => (
                        <button
                            key={group.label}
                            type="button"
                            role="tab"
                            aria-selected={group === active}
                            onClick={() => setTab(group.label)}
                            className={cn(
                                "flex-1 cursor-pointer rounded-[5px] py-1 text-[11px] font-medium transition-colors",
                                group === active ? "bg-white text-[#7A3D5E] shadow-sm" : "text-[#777777] hover:text-[#414141]"
                            )}
                        >
                            {group.label}
                        </button>
                    ))}
                </div>

                <div role="tabpanel" className="mt-2 flex flex-wrap gap-1.5">
                    {active.lines.map((line) => (
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

                <form onSubmit={submit} className="mt-2.5 flex gap-1.5 border-t border-[#F0F0F0] pt-2.5">
                    <input
                        type="text"
                        value={text}
                        maxLength={MAX_LENGTH}
                        disabled={disabled}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Or write your own…"
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
                </form>

                {lastSent && (
                    <p className="mt-1.5 flex items-baseline gap-1.5 text-[10px] text-[#777777]" title={lastSent.message}>
                        <span className="shrink-0 font-semibold uppercase">Sent</span>
                        <span className="min-w-0 flex-1 truncate">{lastSent.message}</span>
                        <span className="shrink-0 tabular-nums">
                            {new Date(lastSent.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    </p>
                )}
            </div>
        </section>
    );
}
