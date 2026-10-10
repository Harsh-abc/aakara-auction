"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Bot, Gavel, Hand, Layers, Users } from "lucide-react";

import DashboardFormText from "@/components/common/DashboardFormText";
import { useAppSelector } from "@/hooks/redux";
import { useAuctionChannel } from "@/hooks/useAuctionChannel";
import { getErrorMessage } from "@/lib/apiError";
import type {
    ActivityFeedItem,
    AuctionActivity,
    BidderRef,
    LiveAuctionStatus,
    LiveLotUpdate,
} from "@/lib/types/bidding.types";
import { formatMoney } from "@/lib/types/LotRow";
import { cn } from "@/lib/utils";
import { getAuctionActivity } from "@/services/operations/bidding.api";

/** Feed rows kept on screen (the server keeps the latest 200) */
const FEED_LIMIT = 50;
/** Top bidders and proxies are refetched shortly after bids land (not on every bid) */
const RESYNC_AFTER_BID_MS = 3_000;
/** …and on this beat regardless (proxies left on upcoming lots, the 5-minute count) */
const RESYNC_MS = 60_000;

const timeFmt = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
});

const money = (amount: string, code: string) => formatMoney(Number(amount), code);

const bidderLabel = (bidder: BidderRef | null) => bidder?.name ?? "Unknown bidder";

interface LiveBiddingPanelProps {
    auctionUuid: string;
    /** a lot's bids or status changed — the floor patches its lot table */
    onLotUpdate?: (update: LiveLotUpdate) => void;
    onAuctionStatus?: (update: LiveAuctionStatus) => void;
}

// Bids as they arrive on the selected sale: who is bidding, how (in the room or by proxy) and how much
export default function LiveBiddingPanel({ auctionUuid, onLotUpdate, onAuctionStatus }: LiveBiddingPanelProps) {
    const token = useAppSelector((state) => state.auth.accessToken);

    // tagged with the auction it was loaded for, so switching sales never shows the old one's bids
    const [activity, setActivity] = useState<(AuctionActivity & { key: string }) | null>(null);
    const [error, setError] = useState<{ key: string; message: string } | null>(null);
    const [reload, setReload] = useState(0);
    const resyncTimer = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        getAuctionActivity(auctionUuid, token)
            .then((data) => {
                if (cancelled) return;
                setActivity({ ...data, key: auctionUuid });
                setError(null);
            })
            .catch((err) => {
                if (!cancelled) setError({ key: auctionUuid, message: getErrorMessage(err, "Couldn't load bidding activity") });
            });
        return () => {
            cancelled = true;
        };
    }, [auctionUuid, token, reload]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") setReload((n) => n + 1);
        }, RESYNC_MS);
        return () => {
            window.clearInterval(timer);
            if (resyncTimer.current) window.clearTimeout(resyncTimer.current);
        };
    }, []);

    const scheduleResync = () => {
        if (resyncTimer.current) return;
        resyncTimer.current = window.setTimeout(() => {
            resyncTimer.current = null;
            setReload((n) => n + 1);
        }, RESYNC_AFTER_BID_MS);
    };

    const connected = useAuctionChannel(
        auctionUuid,
        {
            onStaffBid: (event) => {
                const rows: ActivityFeedItem[] = event.bids.map((bid) => ({
                    ...bid,
                    lotUuid: event.lotUuid,
                    itemNumber: event.itemNumber,
                    title: event.title,
                }));
                setActivity((prev) => {
                    if (!prev || prev.key !== auctionUuid) return prev;
                    const known = new Set(prev.feed.map((row) => row.uuid));
                    return {
                        ...prev,
                        stats: { ...prev.stats, ...event.stats, recentBids: prev.stats.recentBids + rows.length },
                        feed: [...rows.filter((row) => !known.has(row.uuid)), ...prev.feed].slice(0, FEED_LIMIT),
                    };
                });
                scheduleResync();
            },
            onLotUpdate,
            onAuctionStatus,
            onReconnect: () => setReload((n) => n + 1),
        },
        { staff: true }
    );

    const current = activity?.key === auctionUuid ? activity : null;
    const loadError = !current && error?.key === auctionUuid ? error.message : null;
    const code = current?.auction.currency.code ?? "INR";
    const stats = current?.stats;

    return (
        <section className="mt-8 rounded-[8px] bg-[#F4F4F4] px-6 pt-6 pb-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <DashboardFormText text="Live Bidding Activity" className="text-[24px]" />
                <span
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                        connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    )}
                >
                    <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "animate-pulse bg-emerald-500" : "bg-amber-500")} />
                    {connected ? "Receiving bids live" : "Reconnecting…"}
                </span>
            </div>

            {loadError && <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{loadError}</div>}

            {/* totals */}
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Stat icon={<Gavel className="h-4 w-4" />} label="Total bids" value={stats?.totalBids} />
                <Stat icon={<Users className="h-4 w-4" />} label="Active bidders" value={stats?.bidders} />
                <Stat icon={<Hand className="h-4 w-4" />} label="Live bids" value={stats?.manualBids} hint="placed by bidders" />
                <Stat icon={<Bot className="h-4 w-4" />} label="Proxy bids" value={stats?.proxyBids} hint="placed automatically" />
                <Stat icon={<Activity className="h-4 w-4" />} label="Last 5 minutes" value={stats?.recentBids} />
                <Stat icon={<Layers className="h-4 w-4" />} label="Proxies in play" value={stats?.proxiesInPlay} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* feed */}
                <div className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                    <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
                        <p className="text-[12px] font-semibold text-slate-700">Bid feed</p>
                        <p className="text-[11px] text-slate-500">Newest first</p>
                    </div>

                    {!current ? (
                        <FeedSkeleton />
                    ) : current.feed.length === 0 ? (
                        <p className="px-3 py-10 text-center text-sm text-slate-500">No bids yet. They appear here the moment they&apos;re placed.</p>
                    ) : (
                        <ol className="max-h-105 divide-y divide-slate-100 overflow-y-auto">
                            {current.feed.map((bid, index) => (
                                <li
                                    key={bid.uuid}
                                    className={cn(
                                        "grid grid-cols-[72px_64px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-[12px] animate-in fade-in-0 slide-in-from-top-1 duration-300",
                                        index === 0 && "bg-emerald-50/50"
                                    )}
                                >
                                    <span className="whitespace-nowrap text-slate-400">{timeFmt.format(new Date(bid.placedAt))}</span>
                                    <span className="font-semibold text-slate-500" title={bid.title ?? undefined}>
                                        Lot #{bid.itemNumber.padStart(2, "0")}
                                    </span>
                                    <span className="min-w-0 truncate text-slate-700" title={bidderLabel(bid.bidder)}>
                                        {bid.bidder?.paddle && (
                                            <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                                                #{bid.bidder.paddle}
                                            </span>
                                        )}
                                        {bidderLabel(bid.bidder)}
                                    </span>
                                    <span className="flex items-center justify-end gap-2 whitespace-nowrap">
                                        <SourceBadge source={bid.source} />
                                        <span className="font-semibold text-slate-800">{money(bid.amount, code)}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    {/* top bidders */}
                    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                        <div className="flex h-10 items-center border-b border-slate-200 bg-slate-50 px-3">
                            <p className="text-[12px] font-semibold text-slate-700">Most active bidders</p>
                        </div>
                        {!current ? (
                            <FeedSkeleton rows={3} />
                        ) : current.topBidders.length === 0 ? (
                            <p className="px-3 py-6 text-center text-[12px] text-slate-500">No bidders yet</p>
                        ) : (
                            <ol className="divide-y divide-slate-100">
                                {current.topBidders.map(({ bidder, bids }, index) => (
                                    <li key={bidder?.uuid ?? index} className="flex items-center gap-3 px-3 py-2 text-[12px]">
                                        <span className="w-4 text-slate-400">{index + 1}</span>
                                        <span className="min-w-0 flex-1 truncate text-slate-700">
                                            {bidder?.paddle && <span className="mr-1.5 text-slate-500">#{bidder.paddle}</span>}
                                            {bidderLabel(bidder)}
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                            {bids} {bids === 1 ? "bid" : "bids"}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>

                    {/* proxies */}
                    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                        <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
                            <p className="text-[12px] font-semibold text-slate-700">Proxy bids in play</p>
                            <p className="text-[11px] text-slate-500">Highest maximum first</p>
                        </div>
                        {!current ? (
                            <FeedSkeleton rows={2} />
                        ) : current.proxies.length === 0 ? (
                            <p className="px-3 py-6 text-center text-[12px] text-slate-500">No proxy bids waiting</p>
                        ) : (
                            <ol className="max-h-60 divide-y divide-slate-100 overflow-y-auto">
                                {current.proxies.map((proxy) => (
                                    <li key={`${proxy.lotUuid}:${proxy.bidder?.uuid}`} className="flex items-center gap-3 px-3 py-2 text-[12px]">
                                        <span className="w-14 shrink-0 font-semibold text-slate-500" title={proxy.title ?? undefined}>
                                            Lot #{proxy.itemNumber.padStart(2, "0")}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-slate-700" title={bidderLabel(proxy.bidder)}>
                                            {bidderLabel(proxy.bidder)}
                                            {proxy.leading && (
                                                <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Leading</span>
                                            )}
                                        </span>
                                        <span className="whitespace-nowrap font-semibold text-slate-800">
                                            up to {money(proxy.maxAmount, proxy.currency.code)}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

const Stat = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value?: number; hint?: string }) => (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            {icon}
            {label}
        </p>
        {value === undefined ? (
            <div className="mt-1.5 h-6 w-12 animate-pulse rounded bg-slate-100" />
        ) : (
            <p className="mt-0.5 text-[22px] font-bold text-[#414141] tabular-nums">{value.toLocaleString("en-IN")}</p>
        )}
        {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
);

const SourceBadge = ({ source }: { source: "MANUAL" | "PROXY" }) => (
    <span
        className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            source === "PROXY" ? "bg-violet-50 text-[#7b365d]" : "bg-sky-50 text-sky-700"
        )}
    >
        {source === "PROXY" ? "Proxy" : "Bid"}
    </span>
);

const FeedSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <div className="space-y-2 p-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100" />
        ))}
    </div>
);
