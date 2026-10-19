"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Bot, Gavel, ImageOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AuctionConsole, ConsoleLot, ConsolePosition } from "@/lib/types/bidding.types";
import { cn } from "@/lib/utils";

import { buyerPremiumOn, money, paddleLabel, sourceBadge } from "./consoleDisplay";

/** What placing the lot's proxy bids did when Sell was clicked */
export interface ProxyStep {
    message: string;
    /** bids the proxies placed (0 = none topped the standing bid) */
    placed: number;
    /** the lot's bid count right after — the position catches up to it over the socket */
    bidCount: string;
}

/** "Going once… going twice… going three times…" — one second each before the sale can be confirmed */
const COUNTDOWN = ["Going once…", "Going twice…", "Going three times…"];

interface HammerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lot: ConsoleLot;
    position: ConsolePosition;
    buyerPremium: AuctionConsole["buyerPremium"];
    /** set when the lot had proxy bids: they were placed, and the dialog counts down before selling */
    proxyStep: ProxyStep | null;
    busy: boolean;
    /** sells at the bid count shown, so a bid landing meanwhile stops the sale */
    onConfirm: (bidCount: number) => void;
}

// Sell confirmation. Every figure is read from the live position, so a bid that
// lands while it's open changes the winner and price in place (and says so).
// After proxy bids were placed it counts 1-2-3 first; a new bid restarts the count.
export default function HammerDialog({ open, onOpenChange, lot, position, buyerPremium, proxyStep, busy, onConfirm }: HammerDialogProps) {
    // the proxies' own bids arriving over the socket aren't "new" — count from what they left
    const liveCount = Math.max(Number(position.bidCount), Number(proxyStep?.bidCount ?? 0));

    // bid count when the auctioneer opened the dialog, and which opening this is — reset each time it opens
    const [seenBidCount, setSeenBidCount] = useState(liveCount);
    const [session, setSession] = useState(0);
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setSeenBidCount(liveCount);
            setSession((n) => n + 1);
        }
    }

    // countdown: restarts when the dialog opens or a new bid comes in
    const withCountdown = proxyStep !== null;
    const countKey = `${session}|${liveCount}`;
    const [count, setCount] = useState({ key: countKey, tick: 0 });
    const tick = count.key === countKey ? count.tick : 0;
    const counting = withCountdown && tick < COUNTDOWN.length;

    useEffect(() => {
        if (!open || !counting) return;
        const timer = window.setTimeout(() => setCount({ key: countKey, tick: tick + 1 }), 1000);
        return () => window.clearTimeout(timer);
    }, [open, counting, countKey, tick]);

    const code = lot.currency.code;
    const leader = position.leader;
    const hammer = position.currentBid === null ? null : Number(position.currentBid);
    const premium = hammer === null ? 0 : buyerPremiumOn(hammer, buyerPremium);
    const bids = Number(position.bidCount);
    // the proxies' bids are placed but not on screen yet
    const syncing = proxyStep !== null && bids < Number(proxyStep.bidCount);
    const changed = open && liveCount !== seenBidCount;
    const canSell = hammer !== null && leader !== null && bids > 0;
    const canConfirm = canSell && !busy && !syncing && !counting;

    return (
        <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#414141]">
                        <Gavel className="h-5 w-5 text-[#F59E0B]" />
                        Sell Lot #{lot.itemNumber}?
                    </DialogTitle>
                    <DialogDescription>
                        The lot is knocked down to the leading bidder at the current bid. Bidding closes and this can&apos;t
                        be undone.
                    </DialogDescription>
                </DialogHeader>

                {/* lot */}
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {lot.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={lot.imageUrl} alt={lot.title} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-300">
                                <ImageOff className="h-5 w-5" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-[#414141]">{lot.artistName || lot.title}</p>
                        {lot.artistName && <p className="truncate text-[12px] text-slate-500">{lot.title}</p>}
                        <p className="text-[11px] text-slate-400">
                            {bids} {bids === 1 ? "bid" : "bids"}
                        </p>
                    </div>
                </div>

                {/* what the proxy bids did */}
                {proxyStep && (
                    <p
                        className={cn(
                            "flex items-start gap-2 rounded-md px-3 py-2 text-[12px]",
                            proxyStep.placed > 0 ? "bg-violet-50 text-[#7b365d]" : "bg-slate-50 text-slate-600"
                        )}
                    >
                        <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                            <span className="font-semibold">{proxyStep.placed > 0 ? "Proxy bids placed. " : "Proxy bids checked. "}</span>
                            {proxyStep.message}
                        </span>
                    </p>
                )}

                {changed && (
                    <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        A new bid came in while this was open — the winner and price below are up to date
                        {withCountdown ? ", and the count started again." : "."}
                    </p>
                )}

                {syncing ? (
                    <p className="flex items-center justify-center gap-2 rounded-md bg-slate-50 px-3 py-6 text-[13px] text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating with the proxy bids…
                    </p>
                ) : canSell ? (
                    <div className="space-y-3">
                        {/* winner */}
                        <div className="rounded-lg bg-[#F4F4F4] px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Winning bidder</p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[15px] font-semibold text-[#414141]">{paddleLabel(leader)}</p>
                                    {leader.paddle && leader.name && (
                                        <p className="truncate text-[12px] text-slate-500">{leader.name}</p>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                        sourceBadge(leader.source).className
                                    )}
                                >
                                    {sourceBadge(leader.source).label}
                                </span>
                            </div>
                        </div>

                        {/* amounts */}
                        <dl className="space-y-1.5 text-[13px]">
                            <div className="flex items-baseline justify-between">
                                <dt className="text-slate-600">Hammer price</dt>
                                <dd className="text-[20px] font-bold text-[#414141] tabular-nums">{money(hammer, code)}</dd>
                            </div>
                            {buyerPremium.length > 0 && (
                                <>
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">
                                            Buyer&apos;s premium
                                            <span className="ml-1 text-[11px] text-slate-400">
                                                (
                                                {buyerPremium
                                                    .map((fee) =>
                                                        fee.calculationType === "PERCENTAGE"
                                                            ? `${Number(fee.value)}%`
                                                            : money(fee.value, code)
                                                    )
                                                    .join(" + ")}
                                                )
                                            </span>
                                        </dt>
                                        <dd className="tabular-nums text-slate-700">{money(premium, code)}</dd>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
                                        <dt className="text-slate-700">Total due from buyer</dt>
                                        <dd className="tabular-nums text-[#414141]">{money(hammer + premium, code)}</dd>
                                    </div>
                                </>
                            )}
                        </dl>

                        {position.reserveMet ? (
                            <p className="flex items-center gap-1.5 text-[12px] text-emerald-700">
                                <BadgeCheck className="h-3.5 w-3.5" />
                                {lot.reservePrice ? "Reserve met" : "No reserve on this lot"}
                            </p>
                        ) : (
                            <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                The bid is below the reserve of {money(lot.reservePrice, code)}. Selling now overrides the
                                reserve.
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="rounded-md bg-slate-50 px-3 py-3 text-[13px] text-slate-600">
                        There are no bids on this lot yet, so there&apos;s no one to sell it to.
                    </p>
                )}

                {/* 1 · 2 · 3 */}
                {withCountdown && canSell && !syncing && (
                    <div className="flex items-center gap-3 rounded-lg border border-[#F5C26B] bg-[#FFF8E6] px-4 py-3">
                        <div className="flex gap-1.5" aria-hidden>
                            {COUNTDOWN.map((_, index) => (
                                <span
                                    key={index}
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-bold tabular-nums transition-colors",
                                        index < tick
                                            ? "bg-[#F59E0B] text-white"
                                            : index === tick
                                              ? "bg-white text-[#B7791F] ring-2 ring-[#F59E0B] animate-pulse"
                                              : "bg-white text-slate-300 ring-1 ring-slate-200"
                                    )}
                                >
                                    {index + 1}
                                </span>
                            ))}
                        </div>
                        <p className="text-[13px] font-medium text-[#8A5B00]" role="status" aria-live="polite">
                            {counting ? COUNTDOWN[tick] : "Ready — confirm the sale"}
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-[#F59E0B] text-white hover:bg-[#F59E0B]/90"
                        disabled={!canConfirm}
                        onClick={() => onConfirm(bids)}
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                        {busy
                            ? "Selling…"
                            : withCountdown && counting && canSell
                              ? `${tick + 1}…`
                              : `Sell for ${money(hammer, code)}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
