"use client";

import { useState, type FormEvent } from "react";
import { Hand, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AuctionConsole } from "@/lib/types/bidding.types";

import { money } from "./consoleDisplay";

const SUGGESTIONS = 6;

interface FloorBidDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemNumber: string;
    currency: string;
    /** the increment picked on the console */
    amount: string;
    /** smallest valid bid right now */
    nextBid: string;
    floorBidders: AuctionConsole["floorBidders"];
    busy: boolean;
    onSubmit: (paddleNumber: string, amount: number) => void;
}

// The auctioneer enters which paddle went up in the room, for the picked amount
export default function FloorBidDialog({
    open,
    onOpenChange,
    itemNumber,
    currency,
    amount: pickedAmount,
    nextBid,
    floorBidders,
    busy,
    onSubmit,
}: FloorBidDialogProps) {
    const [paddle, setPaddle] = useState("");
    const [amount, setAmount] = useState(pickedAmount);
    const [error, setError] = useState<string | null>(null);

    // fresh form each time it opens, at the amount picked on the console
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setPaddle("");
            setAmount(pickedAmount);
            setError(null);
        }
    }

    const query = paddle.trim().replace(/^#/, "").toLowerCase();
    const exact = floorBidders.find((bidder) => bidder.paddle.toLowerCase() === query) ?? null;
    const suggestions =
        query && !exact
            ? floorBidders
                  .filter((bidder) => bidder.paddle.toLowerCase().startsWith(query) || bidder.name?.toLowerCase().includes(query))
                  .slice(0, SUGGESTIONS)
            : [];

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const value = Number(amount);
        if (!query) return setError("Enter the paddle number raised in the room");
        if (!Number.isFinite(value) || value <= 0) return setError("Enter the bid amount");
        if (value < Number(nextBid)) return setError(`The bid must be at least ${money(nextBid, currency)}`);
        setError(null);
        onSubmit(query, value);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#414141]">
                            <Hand className="h-5 w-5 text-[#22C55E]" />
                            Floor bid · Lot #{itemNumber}
                        </DialogTitle>
                        <DialogDescription>Enter the paddle raised in the room. The bid goes on the lot at once.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-1.5">
                        <label htmlFor="floor-paddle" className="text-[12px] font-medium text-slate-600">
                            Paddle number
                        </label>
                        <Input
                            id="floor-paddle"
                            autoFocus
                            autoComplete="off"
                            inputMode="numeric"
                            placeholder="e.g. 1042"
                            value={paddle}
                            onChange={(e) => setPaddle(e.target.value)}
                            className="h-11 text-[16px] font-semibold"
                        />
                        {exact ? (
                            <p className="text-[12px] text-emerald-700">
                                #{exact.paddle} · {exact.name ?? "Verified bidder"}
                            </p>
                        ) : query && suggestions.length === 0 ? (
                            <p className="text-[12px] text-amber-700">No verified bidder on this lot holds that paddle</p>
                        ) : null}
                        {suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {suggestions.map((bidder) => (
                                    <button
                                        key={bidder.uuid ?? bidder.paddle}
                                        type="button"
                                        onClick={() => setPaddle(bidder.paddle)}
                                        className="cursor-pointer rounded-full border border-slate-200 px-2.5 py-1 text-[12px] text-slate-700 hover:border-[#22C55E] hover:bg-emerald-50"
                                    >
                                        <span className="font-semibold">#{bidder.paddle}</span>
                                        {bidder.name && <span className="ml-1 text-slate-500">{bidder.name}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-1.5">
                        <label htmlFor="floor-amount" className="text-[12px] font-medium text-slate-600">
                            Amount ({currency})
                        </label>
                        <Input
                            id="floor-amount"
                            type="number"
                            min={nextBid}
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-11 text-[16px] font-semibold tabular-nums"
                        />
                        <p className="text-[11px] text-slate-500">
                            {Number(amount) > 0 ? money(amount, currency) : "—"} · minimum {money(nextBid, currency)}
                        </p>
                    </div>

                    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy} className="bg-[#22C55E] text-white hover:bg-[#22C55E]/90">
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                            {busy ? "Placing…" : "Place Bid"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
