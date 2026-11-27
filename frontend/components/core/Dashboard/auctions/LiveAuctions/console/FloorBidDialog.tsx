"use client";

import { useState, type FormEvent } from "react";
import { Bot, Check, Hand, Loader2, Phone, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AuctionConsole, ConsolePosition } from "@/lib/types/bidding.types";
import { cn } from "@/lib/utils";

import { money, paddleLabel, sourceBadge } from "./consoleDisplay";

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
    /** the lot's bids, newest first — paddles that bid lately go to the top of the list */
    recentBids: AuctionConsole["bids"];
    /** the highest bid on the lot right now, null before the first bid */
    currentBid: ConsolePosition["currentBid"];
    leader: ConsolePosition["leader"];
    /** the bidder leading the lot, marked in the list */
    leaderUuid: string | null;
    busy: boolean;
    onSubmit: (paddleNumber: string, amount: number) => void;
}

type Filter = "all" | "proxy" | "interested";

// The auctioneer picks the paddle they're bidding for (in the room, on the phone or online), for the picked amount.
// Bidders holding a proxy on the lot are outlined in violet and listed first; phone bidders interested in the lot
// (picked on Manage Bidders) are in a solid purple box with a phone icon.
export default function FloorBidDialog({
    open,
    onOpenChange,
    itemNumber,
    currency,
    amount: pickedAmount,
    nextBid,
    floorBidders,
    recentBids,
    currentBid,
    leader,
    leaderUuid,
    busy,
    onSubmit,
}: FloorBidDialogProps) {
    const [paddle, setPaddle] = useState("");
    const [amount, setAmount] = useState(pickedAmount);
    // open on the proxy holders, else the interested phone bidders, else everyone
    const defaultFilter = (): Filter =>
        floorBidders.some((bidder) => bidder.proxyMax !== null)
            ? "proxy"
            : floorBidders.some((bidder) => bidder.phoneInterest)
              ? "interested"
              : "all";
    const [filter, setFilter] = useState<Filter>(defaultFilter);
    const [error, setError] = useState<string | null>(null);
    // the auctioneer typed their own amount
    const [edited, setEdited] = useState(false);

    // fresh form each time it opens, at the amount picked on the console
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setPaddle("");
            setAmount(pickedAmount);
            setFilter(defaultFilter());
            setError(null);
            setEdited(false);
        }
    }

    // keep the amount live while bids land with the dialog open: follow the picked/next bid until the
    // auctioneer types their own figure, and lift a typed figure that a new bid has left below the minimum
    const [synced, setSynced] = useState({ pickedAmount, nextBid });
    if (synced.pickedAmount !== pickedAmount || synced.nextBid !== nextBid) {
        setSynced({ pickedAmount, nextBid });
        if (open) {
            if (!edited) {
                setAmount(pickedAmount);
            } else if (!(Number(amount) >= Number(nextBid))) {
                setAmount(nextBid);
                setEdited(false);
            }
            setError(null);
        }
    }

    const query = paddle.trim().replace(/^#/, "").toLowerCase();
    const exact = floorBidders.find((bidder) => bidder.paddle.toLowerCase() === query) ?? null;
    const proxyCount = floorBidders.filter((bidder) => bidder.proxyMax !== null).length;
    const interestedCount = floorBidders.filter((bidder) => bidder.phoneInterest).length;
    const inTab = (bidder: (typeof floorBidders)[number]) =>
        filter === "all" || (filter === "proxy" ? bidder.proxyMax !== null : bidder.phoneInterest);
    // narrowed by what's typed (paddle prefix or name), with an exact paddle match first
    // a proxy whose max is below the amount being bid (or the minimum, whichever is higher) is outbid —
    // it drops to the end of the list, and re-sorts live as the amount is typed
    const typed = Number(amount);
    const bar = Math.max(Number(nextBid) || 0, Number.isFinite(typed) ? typed : 0);
    const isOutbid = (bidder: (typeof floorBidders)[number]) =>
        bidder.proxyMax !== null && Number(bidder.proxyMax) < bar;
    // paddles that bid on this lot, most recent first — they're the ones the auctioneer is most likely to bid for again
    const recentRank = new Map<string, number>();
    for (const bid of recentBids) {
        const paddleNo = bid.bidder?.paddle;
        if (paddleNo && !recentRank.has(paddleNo)) recentRank.set(paddleNo, recentRank.size);
    }
    const rankOf = (bidder: (typeof floorBidders)[number]) => recentRank.get(bidder.paddle) ?? Infinity;
    const shown = floorBidders
        .filter(
            (bidder) =>
                inTab(bidder) &&
                (!query || bidder.paddle.toLowerCase().startsWith(query) || bidder.name?.toLowerCase().includes(query))
        )
        .sort(
            (a, b) =>
                Number(b.paddle === exact?.paddle) - Number(a.paddle === exact?.paddle) ||
                // Infinity - Infinity is NaN, which `||` skips to the next rule
                rankOf(a) - rankOf(b) ||
                Number(isOutbid(a)) - Number(isOutbid(b))
        );

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const value = Number(amount);
        if (!query) return setError("Pick the bidder's paddle");
        if (!Number.isFinite(value) || value <= 0) return setError("Enter the bid amount");
        if (value < Number(nextBid)) return setError(`The bid must be at least ${money(nextBid, currency)}`);
        setError(null);
        onSubmit(query, value);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
            <DialogContent className="sm:max-w-xl" showCloseButton={!busy}>
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#414141]">
                            <Hand className="h-5 w-5 text-[#22C55E]" />
                            Bid for a bidder · Lot #{itemNumber}
                        </DialogTitle>
                        <DialogDescription>
                            Pick the paddle you&apos;re bidding for — in the room, on the phone or online. The bid goes on the lot at once.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between gap-3 rounded-[8px] bg-[#F4F4F4] px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-slate-500">
                                {currentBid !== null ? "Current bid" : "Opening ask"}
                            </p>
                            <p className="text-[20px] leading-tight font-bold text-[#414141] tabular-nums">
                                {money(currentBid ?? nextBid, currency)}
                            </p>
                        </div>
                        {leader ? (
                            <span className="truncate rounded-full border border-[#22C55E] bg-white px-3 py-0.5 text-[12px] font-medium text-[#16A34A]">
                                Leading: {paddleLabel(leader)} ({sourceBadge(leader.source).label})
                            </span>
                        ) : (
                            <span className="rounded-full border border-slate-300 bg-white px-3 py-0.5 text-[12px] text-slate-500">
                                No bids yet
                            </span>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <label htmlFor="floor-paddle" className="text-[12px] font-medium text-slate-600">
                                Bidder
                            </label>
                            <div role="tablist" className="flex gap-1 rounded-md bg-slate-100 p-0.5 text-[11px]">
                                {(
                                    [
                                        ["all", `All · ${floorBidders.length}`],
                                        ["proxy", `Proxies · ${proxyCount}`],
                                        ["interested", `Interested in · ${interestedCount}`],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="tab"
                                        aria-selected={filter === value}
                                        onClick={() => setFilter(value)}
                                        title={value === "interested" ? "Phone bidders who picked this lot on Manage Bidders" : undefined}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 font-medium transition-colors",
                                            filter === value
                                                ? value === "interested"
                                                    ? "bg-purple-600 text-white shadow-sm"
                                                    : "bg-white text-[#414141] shadow-sm"
                                                : value === "interested"
                                                  ? "text-purple-700 hover:text-purple-900"
                                                  : "text-slate-500 hover:text-[#414141]"
                                        )}
                                    >
                                        {value === "interested" && <Phone className="h-3 w-3" />}
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                id="floor-paddle"
                                autoFocus
                                autoComplete="off"
                                placeholder="Paddle number or name"
                                value={paddle}
                                onChange={(e) => setPaddle(e.target.value)}
                                className="h-10 pl-9 text-[14px] font-semibold"
                            />
                        </div>

                        {shown.length > 0 ? (
                            <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto pr-1">
                                {shown.map((bidder) => {
                                    const selected = exact?.paddle === bidder.paddle;
                                    const outbid = isOutbid(bidder);
                                    const proxy = bidder.proxyMax !== null && !outbid;
                                    const leading = Boolean(leaderUuid && bidder.uuid === leaderUuid);
                                    const phone = bidder.phoneInterest;
                                    return (
                                        <button
                                            key={bidder.uuid ?? bidder.paddle}
                                            type="button"
                                            onClick={() => setPaddle(bidder.paddle)}
                                            className={cn(
                                                "relative flex min-w-0 cursor-pointer flex-col rounded-[8px] border px-3 py-2 text-left transition-colors",
                                                // interested phone bidder: solid purple box, whatever their proxy
                                                phone
                                                    ? "border-purple-500 bg-purple-100 hover:border-purple-700"
                                                    : proxy
                                                      ? "border-violet-300 bg-violet-50/70 hover:border-violet-500"
                                                      : outbid
                                                        ? "border-red-200 bg-red-50/60 hover:border-red-400"
                                                        : "border-slate-200 bg-white hover:border-[#22C55E] hover:bg-emerald-50/40",
                                                selected &&
                                                    (outbid
                                                        ? "border-red-500 bg-red-50 ring-2 ring-red-500/30"
                                                        : "border-[#22C55E] bg-emerald-50 ring-2 ring-[#22C55E]/40")
                                            )}
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span
                                                    className={cn(
                                                        "flex items-center gap-1 text-[13px] font-semibold",
                                                        bidder.phoneBidder ? "text-purple-700" : "text-[#414141]"
                                                    )}
                                                >
                                                    {bidder.phoneBidder && <Phone className="h-3 w-3" />}#{bidder.paddle}
                                                </span>
                                                {selected ? (
                                                    <Check className={cn("h-3.5 w-3.5", outbid ? "text-red-600" : "text-[#22C55E]")} />
                                                ) : leading ? (
                                                    <span className="rounded-[3px] bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-700 uppercase">
                                                        Leading
                                                    </span>
                                                ) : (
                                                    proxy && <Bot className="h-3.5 w-3.5 text-[#7b365d]" />
                                                )}
                                            </span>
                                            <span className="truncate text-[12px] text-slate-600" title={bidder.name ?? undefined}>
                                                {bidder.name ?? "Verified bidder"}
                                            </span>
                                            {phone && (
                                                <span className="mt-0.5 truncate text-[10px] font-semibold text-purple-700">
                                                    Phone bidder · interested
                                                </span>
                                            )}
                                            {proxy && (
                                                <span className="mt-0.5 truncate text-[10px] font-medium text-[#7b365d]">
                                                    Proxy up to {money(bidder.proxyMax, currency)}
                                                </span>
                                            )}
                                            {outbid && (
                                                <span className="mt-0.5 truncate text-[10px] font-medium text-red-600">
                                                    Proxy {money(bidder.proxyMax, currency)} · outbid
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="rounded-md bg-slate-50 px-3 py-4 text-center text-[12px] text-slate-500">
                                {query && filter !== "all"
                                    ? `No ${filter === "proxy" ? "proxy holder" : "interested phone bidder"} matches that paddle or name — check the All tab`
                                    : query
                                    ? "No verified bidder on this lot matches that paddle or name"
                                    : filter === "proxy"
                                      ? "No bidder holds a proxy on this lot"
                                      : filter === "interested"
                                        ? "No phone bidder is interested in this lot — pick their lots on Manage Bidders"
                                        : "No verified bidders on this lot"}
                            </p>
                        )}

                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="h-2.5 w-2.5 rounded-[3px] border border-purple-500 bg-purple-100" />
                                Phone bidder · interested in this lot
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2.5 w-2.5 rounded-[3px] border border-violet-300 bg-violet-50" />
                                Holds a proxy — placed at the hammer
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2.5 w-2.5 rounded-[3px] border border-red-200 bg-red-50" />
                                Proxy outbid
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2.5 w-2.5 rounded-[3px] border border-slate-200 bg-white" />
                                Verified bidder
                            </span>
                        </p>
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
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setEdited(true);
                            }}
                            className="h-11 text-[16px] font-semibold tabular-nums"
                        />
                        <p className="text-[11px] text-slate-500">
                            {Number(amount) > 0 ? money(amount, currency) : "—"} · minimum {money(nextBid, currency)}
                        </p>
                    </div>

                    {exact?.proxyMax && (
                        <p className="rounded-md bg-violet-50 px-3 py-2 text-[12px] text-[#7b365d]">
                            Paddle #{exact.paddle} also has a proxy up to {money(exact.proxyMax, currency)} on this lot.
                        </p>
                    )}
                    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy} className="bg-[#22C55E] text-white hover:bg-[#22C55E]/90">
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                            {busy ? "Placing…" : exact ? `Place Bid for #${exact.paddle}` : "Place Bid"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
