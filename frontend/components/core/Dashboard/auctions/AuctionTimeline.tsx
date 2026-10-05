"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Eye,
    ImageOff,
    Loader2,
    Pencil,
    RefreshCw,
    Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus";
import type { AuctionStatus, AuctionTimelineType, TimelineAuction } from "@/lib/types/auction.types";
import { formatMoney } from "@/lib/types/LotRow";
import { cn } from "@/lib/utils";
import { getAuctionTimeline } from "@/services/operations/auction.api";

import AuctionStatusControl from "./AuctionStatusControl";

const PAGE_SIZE = 10;

const COPY: Record<AuctionTimelineType, { title: string; subtitle: string; empty: string }> = {
    upcoming: {
        title: "Upcoming Auctions",
        subtitle: "Published auctions that haven't started yet (Scheduled and Preview), soonest first.",
        empty: "No upcoming auctions. Publish a draft to schedule it.",
    },
    past: {
        title: "Past Auctions",
        subtitle: "Ended, settled and cancelled auctions with their lot results, most recent first.",
        empty: "No past auctions yet.",
    },
};

const STATUS_STYLES: Record<AuctionStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-blue-50 text-blue-700",
    PREVIEW: "bg-violet-50 text-violet-700",
    LIVE: "bg-emerald-50 text-emerald-700",
    PAUSED: "bg-amber-50 text-amber-700",
    ENDED: "bg-slate-200 text-slate-700",
    SETTLED: "bg-teal-50 text-teal-700",
    CANCELLED: "bg-red-50 text-red-600",
};

const TYPE_LABEL: Record<TimelineAuction["auctionType"], string> = {
    LIVE: "Live",
    FLOOR: "Floor",
    HYBRID: "Hybrid",
};

// IST, like the other auction pages
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
});
const formatDateTime = (iso?: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");

/** "in 2d 4h" / "in 35m" / "start time passed" */
const startsIn = (iso: string, now: number) => {
    const ms = new Date(iso).getTime() - now;
    if (ms <= 0) return { label: "Start time passed", overdue: true };
    const mins = Math.floor(ms / 60_000);
    const days = Math.floor(mins / 1440);
    const hours = Math.floor((mins % 1440) / 60);
    const label = days > 0 ? `in ${days}d ${hours}h` : hours > 0 ? `in ${hours}h ${mins % 60}m` : `in ${mins}m`;
    return { label, overdue: false };
};

// =====================================================================
// PAGE
// =====================================================================

export default function AuctionTimeline({ type }: { type: AuctionTimelineType }) {
    const dispatch = useAppDispatch();
    const { timeline, timelineLoading, timelineError } = useAppSelector((state) => state.auction);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Clock for "starts in" — ticks every minute
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(t);
    }, []);

    // Debounce typing -> search, back to page 1
    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const load = useCallback(
        () => dispatch(getAuctionTimeline({ type, page, limit: PAGE_SIZE, search })),
        [dispatch, type, page, search]
    );

    useEffect(() => {
        load();
    }, [load]);

    // The store may still hold the other page's data for a moment
    const data = timeline?.type === type ? timeline : null;
    const auctions = data?.auctions ?? [];
    const by = data?.summary.byStatus ?? {};
    const copy = COPY[type];

    const stats =
        type === "upcoming"
            ? [
                { label: "Upcoming auctions", value: data?.summary.total },
                { label: "Starting in 24 hours", value: data?.summary.startingIn24h, tone: "amber" as const },
                { label: "Scheduled", value: by.SCHEDULED },
                { label: "In preview", value: by.PREVIEW },
            ]
            : [
                { label: "Past auctions", value: data?.summary.total },
                { label: "Ended", value: by.ENDED },
                { label: "Settled", value: by.SETTLED, tone: "emerald" as const },
                { label: "Cancelled", value: by.CANCELLED, tone: "red" as const },
            ];

    const headers =
        type === "upcoming"
            ? ["Auction", "Type", "Schedule (IST)", "Starts", "Lots", "Verified bidders", "Est. total", "Status", ""]
            : ["Auction", "Type", "Schedule (IST)", "Lots", "Results", "Total sold", "Status", ""];

    return (
        <div className="space-y-6 px-8 py-8">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold">{copy.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => load()} disabled={timelineLoading}>
                    <RefreshCw className={cn("h-4 w-4", timelineLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                    <div key={s.label} className="rounded-[8px] border border-slate-200 bg-white px-5 py-4">
                        <p className="text-[12px] text-slate-500">{s.label}</p>
                        <p
                            className={cn(
                                "mt-1 text-2xl font-bold",
                                s.tone === "amber"
                                    ? "text-amber-600"
                                    : s.tone === "emerald"
                                        ? "text-emerald-700"
                                        : s.tone === "red"
                                            ? "text-red-600"
                                            : "text-slate-800"
                            )}
                        >
                            {s.value ?? "—"}
                        </p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search title, slug or category"
                    className="h-9 bg-white pl-9 text-sm"
                />
            </div>

            {timelineError && (
                <div className="flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {timelineError}
                    </span>
                    <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => load()}>
                        Retry
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            {headers.map((h, i) => (
                                <TableHead key={i} className="h-9 px-3 text-[11px] font-medium whitespace-nowrap text-slate-700">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {timelineLoading && auctions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={headers.length} className="h-40 text-center text-sm text-slate-500">
                                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                    Loading auctions...
                                </TableCell>
                            </TableRow>
                        ) : auctions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={headers.length} className="h-40 text-center text-sm text-slate-500">
                                    {search ? "No auctions match your search." : copy.empty}
                                </TableCell>
                            </TableRow>
                        ) : (
                            auctions.map((auction) => (
                                <AuctionRow key={auction.uuid} auction={auction} type={type} now={now} onChanged={load} />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                        Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} auctions
                    </span>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={page <= 1 || timelineLoading}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Previous
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={page >= data.pagination.totalPages || timelineLoading}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// =====================================================================
// ROW
// =====================================================================

const AuctionRow = ({
    auction,
    type,
    now,
    onChanged,
}: {
    auction: TimelineAuction;
    type: AuctionTimelineType;
    now: number;
    onChanged: () => void;
}) => {
    const badge = (
        <span
            className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
                STATUS_STYLES[auction.status] ?? "bg-slate-100 text-slate-600"
            )}
        >
            {AUCTION_STATUS_LABELS[auction.status] ?? auction.status}
        </span>
    );

    const category = auction.category?.name
        ? `${auction.category.name}${auction.subCategory?.name ? ` / ${auction.subCategory.name}` : ""}`
        : "—";

    const cell = "px-3 py-2.5 text-[12px] text-slate-600";

    return (
        <TableRow className="hover:bg-slate-50">
            {/* Auction */}
            <TableCell className="px-3 py-2.5">
                <div className="flex min-w-60 items-center gap-3">
                    <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                        {auction.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={auction.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <ImageOff className="h-4 w-4 text-slate-300" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-800" title={auction.title}>
                            {auction.title}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{category}</p>
                    </div>
                </div>
            </TableCell>

            {/* Type */}
            <TableCell className="px-3">
                <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-medium text-[#833b61]">
                    {TYPE_LABEL[auction.auctionType] ?? auction.auctionType}
                </span>
            </TableCell>

            {/* Schedule */}
            <TableCell className={cn(cell, "whitespace-nowrap")}>
                <p className="text-slate-700">{formatDateTime(auction.startTime)}</p>
                <p className="text-slate-400">→ {formatDateTime(auction.endTime)}</p>
            </TableCell>

            {type === "upcoming" ? (
                <>
                    {/* Starts in */}
                    <TableCell className={cn(cell, "whitespace-nowrap")}>
                        {(() => {
                            const s = startsIn(auction.startTime, now);
                            return (
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1",
                                        s.overdue ? "text-amber-600" : "text-slate-700"
                                    )}
                                    title={s.overdue ? "Set the auction to Live to start it" : undefined}
                                >
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    {s.label}
                                </span>
                            );
                        })()}
                    </TableCell>
                    <TableCell className={cn(cell, "font-semibold text-slate-700")}>{auction.lotCount}</TableCell>
                    <TableCell className={cell}>{auction.verifiedBidders ?? 0}</TableCell>
                    <TableCell className={cn(cell, "whitespace-nowrap")}>
                        {auction.estimate && (auction.estimate.low || auction.estimate.high)
                            ? `${formatMoney(auction.estimate.low, auction.estimate.currency)} – ${formatMoney(auction.estimate.high, auction.estimate.currency)}`
                            : "—"}
                    </TableCell>
                </>
            ) : (
                <>
                    <TableCell className={cn(cell, "font-semibold text-slate-700")}>{auction.lotCount}</TableCell>
                    {/* Results */}
                    <TableCell className={cn(cell, "min-w-40")}>
                        {auction.results ? (
                            <div>
                                <p>
                                    <span className="font-medium text-emerald-700">{auction.results.sold} sold</span>
                                    <span className="mx-1 text-slate-300">·</span>
                                    {auction.results.unsold} unsold
                                    {auction.results.withdrawn > 0 && (
                                        <>
                                            <span className="mx-1 text-slate-300">·</span>
                                            {auction.results.withdrawn} withdrawn
                                        </>
                                    )}
                                </p>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-emerald-500"
                                            style={{ width: `${auction.results.sellThrough}%` }}
                                        />
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                        {auction.results.sellThrough}% sell-through
                                    </span>
                                </div>
                            </div>
                        ) : (
                            "—"
                        )}
                    </TableCell>
                    <TableCell className={cn(cell, "whitespace-nowrap font-semibold text-slate-800")}>
                        {auction.results ? formatMoney(auction.results.totalSold, auction.results.currency) : "—"}
                    </TableCell>
                </>
            )}

            {/* Status — super admin can change it; the row may then leave this page */}
            <TableCell className="px-3">
                <AuctionStatusControl auction={auction} badge={badge} onChanged={onChanged} />
            </TableCell>

            {/* Actions */}
            <TableCell className="px-3">
                <div className="flex items-center gap-1">
                    <Link
                        href={`/dashboard/auctions/${auction.uuid}`}
                        title="View"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </Link>
                    {auction.status === "SCHEDULED" && (
                        <Link
                            href={`/dashboard/auctions/${auction.uuid}/edit`}
                            title="Edit"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Link>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
};
