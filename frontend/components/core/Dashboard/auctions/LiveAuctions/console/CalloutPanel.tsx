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

/**
 * The lines an auctioneer says from the rostrum, worded for where the lot stands.
 * Only the paddle is named — bidders' names stay on the console.
 */
const presetCallouts = (lot: ConsoleLot, position: ConsolePosition, code: string) => {
    const nextBid = money(position.nextBid, code);
    if (position.currentBid === null) {
        return [
            `Lot #${lot.itemNumber} is now open — who'll start me at ${nextBid}?`,
            `Opening bid ${nextBid}. Any bidder?`,
            "Don't be shy — this one won't wait",
            "Last chance to open the bidding on this lot",
        ];
    }

    const current = money(position.currentBid, code);
    const leader = position.leader?.paddle ? ` with Paddle #${position.leader.paddle}` : "";
    return [
        `Next bid ${nextBid}`,
        `${current}${leader} — do I hear ${nextBid}?`,
        `Any advance on ${current}?`,
        ...(position.reserveMet ? ["The reserve has been met — this lot will sell"] : []),
        `Fair warning — selling at ${current}`,
        "Going once…",
        "Going twice…",
        "Last call — bid now or lose it",
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
        <section className="mt-5 rounded-[8px] border border-[#E5E5E5] bg-white p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#414141]">
                    <Megaphone className="h-3.5 w-3.5" />
                    Auctioneer Callouts
                </p>
                <span className="text-[10px] text-[#777777]">Shown to everyone watching the sale</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {presetCallouts(lot, position, code).map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        disabled={disabled || sending !== null}
                        onClick={() => send(preset)}
                        className={cn(
                            "flex items-center gap-1 rounded-full border border-[#D9D9D9] bg-white px-3 py-1 text-[12px] text-[#414141] transition-colors",
                            "cursor-pointer hover:border-[#7A3D5E] hover:bg-[#F8F0F4] disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                    >
                        {sending === preset && <Loader2 className="h-3 w-3 animate-spin" />}
                        {preset}
                    </button>
                ))}
            </div>

            <form onSubmit={submit} className="mt-3 flex gap-2">
                <input
                    type="text"
                    value={text}
                    maxLength={MAX_LENGTH}
                    disabled={disabled}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Write your own message to the room…"
                    className="h-9 min-w-0 flex-1 rounded-[6px] border border-[#D9D9D9] px-3 text-[13px] text-[#414141] outline-none focus:border-[#7A3D5E] disabled:bg-slate-50"
                />
                <Button
                    type="submit"
                    className="h-9 gap-1.5 rounded-[6px] bg-[#7A3D5E] px-4 text-[12px] text-white hover:bg-[#7A3D5E]/90"
                    disabled={disabled || !text.trim() || sending !== null}
                >
                    {sending !== null && sending === text.trim() ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send
                </Button>
            </form>

            {sentHere.length > 0 && (
                <ol className="mt-3 space-y-1 border-t border-[#F0F0F0] pt-2">
                    {sentHere.map((callout) => (
                        <li key={callout.id} className="flex items-baseline justify-between gap-3 text-[11px]">
                            <span className="truncate text-[#555555]" title={callout.message}>
                                {callout.message}
                            </span>
                            <span className="shrink-0 text-[#999999] tabular-nums">
                                {new Date(callout.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
