"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
    AlertTriangle,
    ArrowLeft,
    BadgeCheck,
    ChevronLeft,
    ChevronRight,
    ImageOff,
    Loader2,
    RefreshCw,
    Search,
    ShieldAlert,
    Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus";
import type { LotBidder, LotBidderFilter, LotSummary } from "@/lib/types/lotBidder.types";
import { cn } from "@/lib/utils";
import { getLotBidders, getLotSummary, verifyLotBidders } from "@/services/operations/lotBidder.api";
import { KycBadge, PaddleBadge } from "@/components/core/Dashboard/auctions/AddParticipantsDialog";

const PAGE_SIZE = 20;

/** Mirrors EDITABLE_AUCTION_STATUSES in backend/src/services/lotBidder.services.js */
const EDITABLE_AUCTION_STATUSES = ["DRAFT", "SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

const FILTERS: { value: LotBidderFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Awaiting verification" },
    { value: "verified", label: "Verified" },
];

// =====================================================================
// FORMATTERS (IST, like the rest of the auction pages)
// =====================================================================

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
});

const formatDateTime = (iso?: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");
const formatDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—");

const formatMoney = (value: string | null | undefined, currency = "INR") => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    try {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    } catch {
        return `${currency} ${n.toLocaleString("en-IN")}`;
    }
};

const toTitle = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

// =====================================================================
// PAGE
// =====================================================================

export default function LotBiddersPage() {
    const { auctionUuid, lotUuid } = useParams<{ auctionUuid: string; lotUuid: string }>();
    const dispatch = useAppDispatch();

    const isSuperAdmin = useAppSelector((state) => state.auth.role) === "SUPER_ADMIN";
    const { lot, lotError, bidders, summary, pagination, loading, error, updatingUuids } = useAppSelector(
        (state) => state.lotBidder
    );

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<LotBidderFilter>("all");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Debounce typing -> search, and go back to page 1
    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput.trim());
            setSelected(new Set());
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Selection is only ever read against the current page's rows, so a
    // stale entry from another page can't be acted on
    const load = useCallback(
        () => dispatch(getLotBidders({ lotUuid, page, limit: PAGE_SIZE, search, filter })),
        [dispatch, lotUuid, page, search, filter]
    );

    // Lot details load once per lot, independent of the list
    useEffect(() => {
        dispatch(getLotSummary({ lotUuid }));
    }, [dispatch, lotUuid]);

    useEffect(() => {
        load();
    }, [load]);

    const auctionOpen = lot ? EDITABLE_AUCTION_STATUSES.includes(lot.auction.status) : false;
    const canVerify = isSuperAdmin && auctionOpen;

    const updating = useMemo(() => new Set(updatingUuids), [updatingUuids]);

    const setVerified = async (userUuids: string[], verified: boolean) => {
        if (userUuids.length === 0) return;
        try {
            const res = await dispatch(verifyLotBidders({ lotUuid, userUuids, verified })).unwrap();
            toast.success(res.message);
            setSelected(new Set());
            load();
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Could not update bidders. Try again.");
        }
    };

    // Bulk actions only touch selected users whose state would actually change
    const changeQuery = (next: { page?: number; filter?: LotBidderFilter }) => {
        setSelected(new Set());
        if (next.filter) setFilter(next.filter);
        setPage(next.page ?? 1);
    };

    const selectedBidders = bidders.filter((b) => selected.has(b.uuid));
    const toVerify = selectedBidders
        .filter((b) => b.registration.status !== "VERIFIED" && b.kycStatus === "VERIFIED")
        .map((b) => b.uuid);
    const toUnverify = selectedBidders.filter((b) => b.registration.status === "VERIFIED").map((b) => b.uuid);

    const allOnPageSelected = bidders.length > 0 && bidders.every((b) => selected.has(b.uuid));

    const toggleAll = (checked: boolean) => setSelected(checked ? new Set(bidders.map((b) => b.uuid)) : new Set());
    const toggleOne = (uuid: string, checked: boolean) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) next.add(uuid);
            else next.delete(uuid);
            return next;
        });

    // ---------------- states ----------------

    // Only the lot itself failing replaces the page; a list error shows inline
    if (lotError && !lot) {
        return (
            <div className="px-8 py-8">
                <div className="mb-4 flex items-start gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{lotError}</span>
                </div>
                <BackLink auctionUuid={auctionUuid} />
            </div>
        );
    }

    if (!lot) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading lot...
            </div>
        );
    }

    return (
        <div className="space-y-6 px-8 py-8 pb-16">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <BackLink auctionUuid={auctionUuid} label={lot.auction.title} />
                    <h3 className="text-2xl font-bold">Lot Bidders</h3>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Everyone registered for the auction is registered for this lot.{" "}
                        {isSuperAdmin
                            ? "Verify which of them are allowed to bid on it."
                            : "Only a super admin can verify them to bid."}
                    </p>
                </div>

                {/* Registration happens on the auction, not per lot */}
                <Link
                    href={`/dashboard/auctions/${auctionUuid}/registrations`}
                    className={cn(buttonVariants({ variant: "outline" }), "flex items-center gap-2 px-4 text-[14px]")}
                >
                    <Users className="h-4 w-4" />
                    Auction Registrations
                </Link>
            </div>

            <LotSummaryCard lot={lot} />

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Registered for this lot" value={summary?.registered} />
                <StatCard label="Verified to bid" value={summary?.verified} tone="emerald" />
                <StatCard label="Awaiting verification" value={summary?.pending} tone="amber" />
            </div>

            {isSuperAdmin && !auctionOpen && (
                <div className="flex items-start gap-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    The auction is {AUCTION_STATUS_LABELS[lot.auction.status]}, so bidders can no longer be changed.
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search paddle #, name, username, email, phone"
                            className="h-9 bg-white pl-9 text-sm"
                        />
                    </div>

                    <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.value}
                                type="button"
                                onClick={() => changeQuery({ filter: f.value })}
                                className={cn(
                                    "rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                                    filter === f.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {canVerify && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 text-xs"
                            disabled={toUnverify.length === 0 || updating.size > 0}
                            onClick={() => setVerified(toUnverify, false)}
                        >
                            Unverify selected{toUnverify.length ? ` (${toUnverify.length})` : ""}
                        </Button>
                        <Button
                            type="button"
                            className="h-9 bg-[#491B3A] text-xs text-white hover:bg-[#491B3A]/90"
                            disabled={toVerify.length === 0 || updating.size > 0}
                            onClick={() => setVerified(toVerify, true)}
                        >
                            <BadgeCheck className="mr-1 h-4 w-4" />
                            Verify selected{toVerify.length ? ` (${toVerify.length})` : ""}
                        </Button>
                    </div>
                )}
            </div>

            {error && (
                <div className="flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span>{error}</span>
                    <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => load()}>
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            {canVerify && (
                                <TableHead className="w-10 px-3">
                                    <Checkbox
                                        checked={allOnPageSelected}
                                        onCheckedChange={(value) => toggleAll(!!value)}
                                        aria-label="Select all on this page"
                                    />
                                </TableHead>
                            )}
                            {["Paddle", "User", "KYC", "Phone", "Registered", "Bidding on this lot", ...(canVerify ? [""] : [])].map(
                                (h, i) => (
                                    <TableHead key={i} className="h-9 px-3 text-[11px] font-medium whitespace-nowrap text-slate-700">
                                        {h}
                                    </TableHead>
                                )
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading && bidders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40 text-center text-sm text-slate-500">
                                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                    Loading users...
                                </TableCell>
                            </TableRow>
                        ) : bidders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40 text-center text-sm text-slate-500">
                                    {search || filter !== "all" ? (
                                        "No users match your search."
                                    ) : (
                                        <>
                                            No one is registered for this lot yet. Users appear here once they register
                                            for the auction —{" "}
                                            <Link
                                                href={`/dashboard/auctions/${auctionUuid}/registrations`}
                                                className="text-[#833b61] underline-offset-2 hover:underline"
                                            >
                                                manage auction registrations
                                            </Link>
                                            .
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            bidders.map((bidder) => (
                                <BidderRow
                                    key={bidder.uuid}
                                    bidder={bidder}
                                    canVerify={canVerify}
                                    selected={selected.has(bidder.uuid)}
                                    busy={updating.has(bidder.uuid)}
                                    onSelect={(checked) => toggleOne(bidder.uuid, checked)}
                                    onVerify={(verified) => setVerified([bidder.uuid], verified)}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                        Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
                    </span>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={page <= 1 || loading}
                            onClick={() => changeQuery({ page: page - 1 })}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Previous
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={page >= pagination.totalPages || loading}
                            onClick={() => changeQuery({ page: page + 1 })}
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
// PIECES
// =====================================================================

const BackLink = ({ auctionUuid, label = "Back to auction" }: { auctionUuid: string; label?: string }) => (
    <Link
        href={`/dashboard/auctions/${auctionUuid}`}
        className="mb-2 inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800"
    >
        <ArrowLeft className="h-3.5 w-3.5" />
        {label}
    </Link>
);

const StatCard = ({
    label,
    value,
    tone = "slate",
}: {
    label: string;
    value?: number;
    tone?: "slate" | "emerald" | "amber";
}) => (
    <div className="rounded-[8px] border border-slate-200 bg-white px-5 py-4">
        <p className="text-[12px] text-slate-500">{label}</p>
        <p
            className={cn(
                "mt-1 text-2xl font-bold",
                tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-600" : "text-slate-800"
            )}
        >
            {value ?? "—"}
        </p>
    </div>
);

const LotSummaryCard = ({ lot }: { lot: LotSummary }) => {
    const currency = lot.currency?.code ?? "INR";
    const low = formatMoney(lot.estimateLow, currency);
    const high = formatMoney(lot.estimateHigh, currency);

    return (
        <section className="flex flex-col gap-5 rounded-[8px] border border-slate-200 bg-white p-5 sm:flex-row">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-md bg-slate-100">
                {lot.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lot.imageUrl} alt={lot.title} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageOff className="h-6 w-6" />
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-semibold text-[#833b61]">
                        Lot {lot.itemNumber}
                    </span>
                    <Badge variant="outline" className="rounded-full text-[11px] font-medium">
                        {toTitle(lot.status)}
                    </Badge>
                </div>

                <div>
                    <p className="truncate text-base font-semibold text-slate-900">{lot.title}</p>
                    <p className="text-[13px] text-slate-500">
                        {[lot.artistName, lot.medium, lot.yearCreated].filter(Boolean).join(" · ") || "—"}
                    </p>
                </div>

                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
                    <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-400">Starting bid</dt>
                        <dd className="font-medium text-slate-800">{formatMoney(lot.startingPrice, currency) ?? "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-400">Estimate</dt>
                        <dd className="font-medium text-slate-800">{low || high ? `${low ?? "—"} – ${high ?? "—"}` : "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-400">Bidding window (IST)</dt>
                        <dd className="font-medium text-slate-800">
                            {formatDateTime(lot.scheduledStartAt)} → {formatDateTime(lot.scheduledEndAt)}
                        </dd>
                    </div>
                </dl>
            </div>
        </section>
    );
};

const BidderRow = ({
    bidder,
    canVerify,
    selected,
    busy,
    onSelect,
    onVerify,
}: {
    bidder: LotBidder;
    /** Super admin and the auction is still open */
    canVerify: boolean;
    selected: boolean;
    busy: boolean;
    onSelect: (checked: boolean) => void;
    onVerify: (verified: boolean) => void;
}) => {
    const reg = bidder.registration;
    const isVerified = reg.status === "VERIFIED";
    const kycVerified = bidder.kycStatus === "VERIFIED";
    const initials = (bidder.name || bidder.username).slice(0, 2).toUpperCase();

    return (
        <TableRow className={cn(selected && "bg-slate-50")}>
            {canVerify && (
                <TableCell className="px-3">
                    <Checkbox
                        checked={selected}
                        onCheckedChange={(value) => onSelect(!!value)}
                        aria-label={`Select ${bidder.username}`}
                    />
                </TableCell>
            )}

            {/* Paddle */}
            <TableCell className="px-3">
                <PaddleBadge number={bidder.paddleNumber} />
            </TableCell>

            {/* User */}
            <TableCell className="px-3">
                <div className="flex min-w-[220px] items-center gap-3">
                    {bidder.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bidder.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                            {initials}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-800">{bidder.name || bidder.username}</p>
                        <p className="truncate text-[11px] text-slate-500">
                            @{bidder.username} · {bidder.email}
                        </p>
                    </div>
                </div>
            </TableCell>

            {/* KYC — must be verified before they can be verified to bid */}
            <TableCell className="px-3">
                <KycBadge status={bidder.kycStatus} />
            </TableCell>

            {/* Phone */}
            <TableCell className="px-3 text-[12px] whitespace-nowrap text-slate-600">{bidder.phone || "—"}</TableCell>

            {/* How / when they registered for the auction */}
            <TableCell className="px-3 text-[11px] whitespace-nowrap">
                <span
                    className={cn(
                        "rounded px-2 py-0.5",
                        reg.source === "SELF_REGISTERED" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                    )}
                >
                    {reg.source === "SELF_REGISTERED" ? "Self" : "By admin"}
                </span>
                <p className="mt-1 text-slate-400">{formatDate(reg.registeredAt)}</p>
            </TableCell>

            {/* Bidding status */}
            <TableCell className="px-3">
                {isVerified ? (
                    <div className="text-[11px]">
                        <Badge className="rounded-full border-emerald-100 bg-emerald-50 text-[10px] font-medium text-emerald-700" variant="outline">
                            <BadgeCheck className="mr-1 h-3 w-3" />
                            Verified
                        </Badge>
                        <p className="mt-1 text-slate-400">
                            {reg.verifiedBy ? `by @${reg.verifiedBy} · ` : ""}
                            {formatDate(reg.verifiedAt)}
                        </p>
                    </div>
                ) : (
                    <Badge variant="outline" className="rounded-full text-[10px] font-medium text-slate-500">
                        Awaiting verification
                    </Badge>
                )}
            </TableCell>

            {/* Action */}
            {canVerify && (
                <TableCell className="px-3 text-right">
                    <Button
                        type="button"
                        variant={isVerified ? "outline" : "default"}
                        className={cn(
                            "h-8 min-w-24 text-xs",
                            !isVerified && "bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                        )}
                        disabled={busy || (!isVerified && !kycVerified)}
                        title={!isVerified && !kycVerified ? "KYC must be verified before they can bid" : undefined}
                        onClick={() => onVerify(!isVerified)}
                    >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isVerified ? "Unverify" : "Verify"}
                    </Button>
                </TableCell>
            )}
        </TableRow>
    );
};
