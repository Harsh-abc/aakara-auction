"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { ChevronRight, Loader2, RefreshCw, Search, ShieldAlert, Users } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus";
import type { Auction, AuctionStatus } from "@/lib/types/auction.types";
import { cn } from "@/lib/utils";
import { AppDispatch, RootState } from "@/redux/store";
import { getAuctions } from "@/services/operations/auction.api";

// Admins can view bidders; only a super admin can change them (enforced by the API)
const BIDDER_MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN"];

/** Mirrors EDITABLE_AUCTION_STATUSES in backend/src/services/lotBidder.services.js */
const ACTIVE_STATUSES: AuctionStatus[] = ["DRAFT", "SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

type Tab = "active" | "closed" | "all";

const TABS: { value: Tab; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "closed", label: "Closed" },
    { value: "all", label: "All" },
];

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

const dateFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
});

const formatDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—");

const isActive = (auction: Auction) => ACTIVE_STATUSES.includes(auction.status);

// live sales first, then the soonest upcoming; closed sales newest first
const byUrgency = (a: Auction, b: Auction) => {
    const live = (x: Auction) => Number(x.status === "LIVE" || x.status === "PAUSED");
    if (isActive(a) !== isActive(b)) return isActive(a) ? -1 : 1;
    if (!isActive(a)) return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    return live(b) - live(a) || new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
};

export default function ManageBiddersPage() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const role = useSelector((state: RootState) => state.auth.role);
    const { auctions, auctionsLoading, auctionsError } = useSelector((state: RootState) => state.auction);

    const [tab, setTab] = useState<Tab>("active");
    const [search, setSearch] = useState("");

    const canManage = !!role && BIDDER_MANAGER_ROLES.includes(role);

    useEffect(() => {
        if (canManage) dispatch(getAuctions());
    }, [dispatch, canManage]);

    const counts = useMemo(
        () => ({
            active: auctions.filter(isActive).length,
            closed: auctions.filter((a) => !isActive(a)).length,
            all: auctions.length,
        }),
        [auctions]
    );

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return auctions
            .filter((a) => (tab === "all" ? true : tab === "active" ? isActive(a) : !isActive(a)))
            .filter((a) => !query || a.title.toLowerCase().includes(query) || a.slug?.toLowerCase().includes(query))
            .sort(byUrgency);
    }, [auctions, tab, search]);

    const manageHref = (auction: Auction) => `/dashboard/auctions/${auction.uuid}/registrations`;

    if (!canManage) {
        return (
            <div className="px-8 py-8">
                <div className="flex items-start gap-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    Only admins and super admins can manage auction bidders.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-8 py-8 pb-16">
            {/* Header */}
            <div>
                <h3 className="text-2xl font-bold">Manage Bidders</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                    Pick an auction to see who registered, add bidders and verify them for its lots.
                    {role !== "SUPER_ADMIN" && " Only a super admin can add or verify bidders."}
                </p>
            </div>

            {/* Tabs + search */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    {TABS.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setTab(t.value)}
                            className={cn(
                                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                                tab === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            {t.label}
                            <span className="ml-1.5 text-[11px] text-slate-400">{counts[t.value]}</span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search auctions"
                        className="h-10 bg-white pl-9"
                        aria-label="Search auctions"
                    />
                </div>
            </div>

            {/* Load error */}
            {auctionsError && (
                <div className="flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span>{auctionsError}</span>
                    <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => dispatch(getAuctions())}>
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Auctions */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="text-[12px]">Auction</TableHead>
                            <TableHead className="text-[12px]">Status</TableHead>
                            <TableHead className="text-[12px]">Starts</TableHead>
                            <TableHead className="text-right text-[12px]">Lots</TableHead>
                            <TableHead className="text-right text-[12px]">Registered bidders</TableHead>
                            <TableHead className="w-44" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {auctionsLoading && auctions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-12 text-center text-[13px] text-slate-500">
                                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                    Loading auctions...
                                </TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-12 text-center text-[13px] text-slate-400">
                                    {search.trim()
                                        ? "No auctions match your search."
                                        : tab === "active"
                                            ? "No active auctions."
                                            : "No auctions here yet."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((auction) => {
                                const registered = auction._count?.participants ?? 0;
                                return (
                                    <TableRow
                                        key={auction.uuid}
                                        className="cursor-pointer"
                                        onClick={() => router.push(manageHref(auction))}
                                    >
                                        <TableCell className="max-w-0 w-[40%]">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="h-9 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                                                    {auction.coverImageUrl && (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={auction.coverImageUrl} alt="" className="h-full w-full object-cover" />
                                                    )}
                                                </div>
                                                <p className="truncate text-[13px] font-semibold text-slate-800" title={auction.title}>
                                                    {auction.title}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                                                    STATUS_STYLES[auction.status]
                                                )}
                                            >
                                                {auction.status === "LIVE" && (
                                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                                )}
                                                {AUCTION_STATUS_LABELS[auction.status]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-[12px] text-slate-700">
                                            {formatDate(auction.startTime)}
                                        </TableCell>
                                        <TableCell className="text-right text-[12px] font-semibold text-slate-700">
                                            {auction._count?.items ?? 0}
                                        </TableCell>
                                        <TableCell className="text-right text-[12px] font-semibold text-slate-700">
                                            {registered}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link
                                                href={manageHref(auction)}
                                                onClick={(event) => event.stopPropagation()}
                                                className={cn(
                                                    buttonVariants({ variant: "outline" }),
                                                    "h-8 gap-1.5 px-3 text-[12px]"
                                                )}
                                            >
                                                <Users className="h-3.5 w-3.5" />
                                                Manage bidders
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
