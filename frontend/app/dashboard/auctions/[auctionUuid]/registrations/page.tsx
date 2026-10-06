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
    Trash2,
} from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AddParticipantsDialog, { KycBadge, PaddleBadge } from "@/components/core/Dashboard/auctions/AddParticipantsDialog";
import AddUserDialog from "@/components/core/Dashboard/users/AddUserDialog";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus";
import type {
    AuctionParticipant,
    ParticipantAuction,
    ParticipantFilter,
    ParticipantLot,
} from "@/lib/types/auctionParticipant.types";
import type { LotBidderStatus } from "@/lib/types/lotBidder.types";
import { cn } from "@/lib/utils";
import {
    addAuctionParticipants,
    addNewAuctionParticipant,
    getAuctionParticipants,
    removeAuctionParticipants,
    verifyAuctionParticipants,
} from "@/services/operations/auctionParticipant.api";

const PAGE_SIZE = 20;

/** Mirrors EDITABLE_AUCTION_STATUSES in backend/src/services/lotBidder.services.js */
const EDITABLE_AUCTION_STATUSES = ["DRAFT", "SCHEDULED", "PREVIEW", "LIVE", "PAUSED"];

const FILTERS: { value: ParticipantFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "awaiting", label: "Awaiting verification" },
    { value: "self", label: "Self-registered" },
    { value: "admin", label: "Added by admin" },
];

const dateFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
});

const formatDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—");

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

const toTitle = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/** Per-user verification across all lots of the auction */
const lotProgress = (participant: AuctionParticipant, lots: ParticipantLot[]) => {
    const byLot = new Map(participant.lots.map((l) => [l.lotUuid, l.status]));
    const verified = lots.filter((l) => byLot.get(l.uuid) === "VERIFIED").length;
    return { byLot, verified, allVerified: lots.length > 0 && verified === lots.length };
};

// =====================================================================
// PAGE
// =====================================================================

export default function AuctionRegistrationsPage() {
    const { auctionUuid } = useParams<{ auctionUuid: string }>();
    const dispatch = useAppDispatch();

    const isSuperAdmin = useAppSelector((state) => state.auth.role) === "SUPER_ADMIN";
    const {
        auctionUuid: loadedUuid,
        auction,
        lots,
        participants,
        summary,
        pagination,
        loading,
        error,
        updatingUuids,
        adding,
    } = useAppSelector((state) => state.auctionParticipant);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<ParticipantFilter>("all");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmRemove, setConfirmRemove] = useState<string[] | null>(null);

    // Debounce typing -> search, and go back to page 1
    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput.trim());
            setSelected(new Set());
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const load = useCallback(
        () => dispatch(getAuctionParticipants({ auctionUuid, page, limit: PAGE_SIZE, search, filter })),
        [dispatch, auctionUuid, page, search, filter]
    );

    useEffect(() => {
        load();
    }, [load]);

    const updating = useMemo(() => new Set(updatingUuids), [updatingUuids]);

    // ignore data still in the store from another auction
    const current = loadedUuid === auctionUuid ? auction : null;
    const auctionOpen = current ? EDITABLE_AUCTION_STATUSES.includes(current.status) : false;
    const canManage = isSuperAdmin && auctionOpen;

    const changeQuery = (next: { page?: number; filter?: ParticipantFilter }) => {
        setSelected(new Set());
        if (next.filter) setFilter(next.filter);
        setPage(next.page ?? 1);
    };

    const runAction = async (action: () => Promise<{ message: string }>) => {
        try {
            const res = await action();
            toast.success(res.message);
            setSelected(new Set());
            load();
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Something went wrong. Try again.");
        }
    };

    const setVerified = (userUuids: string[], verified: boolean) => {
        if (userUuids.length === 0) return;
        runAction(() => dispatch(verifyAuctionParticipants({ auctionUuid, userUuids, verified })).unwrap());
    };

    // Dialogs toast the result themselves; just refresh the list
    const addExisting = async (userUuids: string[]) => {
        const res = await dispatch(addAuctionParticipants({ auctionUuid, userUuids })).unwrap();
        changeQuery({});
        load();
        return res;
    };

    const remove = async (userUuids: string[]) => {
        await runAction(() => dispatch(removeAuctionParticipants({ auctionUuid, userUuids })).unwrap());
        setConfirmRemove(null);
    };

    // Bulk actions only touch selected users whose state would actually change
    const selectedRows = participants.filter((p) => selected.has(p.uuid));
    const toVerify = selectedRows
        .filter((p) => p.kycStatus === "VERIFIED" && !lotProgress(p, lots).allVerified)
        .map((p) => p.uuid);
    const toUnverify = selectedRows.filter((p) => lotProgress(p, lots).verified > 0).map((p) => p.uuid);

    const allOnPageSelected = participants.length > 0 && participants.every((p) => selected.has(p.uuid));
    const toggleAll = (checked: boolean) => setSelected(checked ? new Set(participants.map((p) => p.uuid)) : new Set());
    const toggleOne = (uuid: string, checked: boolean) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) next.add(uuid);
            else next.delete(uuid);
            return next;
        });

    // ---------------- states ----------------

    if (error && !current) {
        return (
            <div className="px-8 py-8">
                <div className="mb-4 flex items-start gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
                <BackLink auctionUuid={auctionUuid} />
            </div>
        );
    }

    if (!current) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading registrations...
            </div>
        );
    }

    const busy = updating.size > 0;

    return (
        <div className="space-y-6 px-8 py-8 pb-16">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <BackLink auctionUuid={auctionUuid} label={current.title} />
                    <h3 className="text-2xl font-bold">Auction Registrations</h3>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Everyone registered for this auction is registered for all of its lots. They can bid on a lot
                        only once a super admin verifies them for it — here for all lots at once, or lot by lot.
                    </p>
                </div>

                {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                        <AddParticipantsDialog auctionUuid={auctionUuid} busy={adding} onAdd={addExisting} />
                        <AddUserDialog
                            triggerLabel="Add New Bidder"
                            title="Add New Bidder"
                            description={`Creates a login account for this person (KYC approved) and registers them for every lot in "${current.title}". Verify them per lot before they can bid.`}
                            submitLabel="Create & Register"
                            successMessage="Bidder created and registered for this auction"
                            busy={adding}
                            onCreate={async (user) => {
                                // the message includes the paddle number they were given
                                const res = await dispatch(addNewAuctionParticipant({ auctionUuid, ...user })).unwrap();
                                changeQuery({});
                                load();
                                return res.message;
                            }}
                        />
                    </div>
                )}
            </div>

            <AuctionOverview auction={current} lotCount={lots.length} />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Registered" value={summary?.total} />
                <StatCard label="Self-registered" value={summary?.selfRegistered} />
                <StatCard label="Added by admin" value={summary?.addedByAdmin} />
                <StatCard label="Awaiting verification" value={summary?.awaiting} tone="amber" />
            </div>

            {isSuperAdmin && !auctionOpen && (
                <div className="flex items-start gap-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    The auction is {AUCTION_STATUS_LABELS[current.status]}, so registrations can no longer be changed.
                </div>
            )}

            {/* Lot-wise */}
            <section className="space-y-3">
                <h4 className="text-base font-semibold text-slate-900">Registrations by lot</h4>
                {lots.length === 0 ? (
                    <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-[13px] text-slate-400">
                        This auction has no lots yet. Registrants are added to lots automatically when lots are added.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {lots.map((lot) => (
                            <LotRegistrationCard key={lot.uuid} lot={lot} auctionUuid={auctionUuid} />
                        ))}
                    </div>
                )}
            </section>

            <h4 className="pt-2 text-base font-semibold text-slate-900">Registered users</h4>

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
                                    "cursor-pointer rounded px-3 py-1.5 text-xs font-medium transition-colors",
                                    filter === f.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 text-xs text-red-600 hover:text-red-700"
                            disabled={selectedRows.length === 0 || busy}
                            onClick={() => setConfirmRemove(selectedRows.map((p) => p.uuid))}
                        >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Remove{selectedRows.length ? ` (${selectedRows.length})` : ""}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 text-xs"
                            disabled={toUnverify.length === 0 || busy}
                            onClick={() => setVerified(toUnverify, false)}
                        >
                            Unverify all lots{toUnverify.length ? ` (${toUnverify.length})` : ""}
                        </Button>
                        <Button
                            type="button"
                            className="h-9 bg-[#491B3A] text-xs text-white hover:bg-[#491B3A]/90"
                            disabled={toVerify.length === 0 || busy}
                            onClick={() => setVerified(toVerify, true)}
                        >
                            <BadgeCheck className="mr-1 h-4 w-4" />
                            Verify on all lots{toVerify.length ? ` (${toVerify.length})` : ""}
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
                            {canManage && (
                                <TableHead className="w-10 px-3">
                                    <Checkbox
                                        checked={allOnPageSelected}
                                        onCheckedChange={(value) => toggleAll(!!value)}
                                        aria-label="Select all on this page"
                                    />
                                </TableHead>
                            )}
                            {["Paddle", "User", "KYC", "Registered", "Lots", ...(canManage ? [""] : [])].map((h, i) => (
                                <TableHead key={i} className="h-9 px-3 text-[11px] font-medium whitespace-nowrap text-slate-700">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading && participants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center text-sm text-slate-500">
                                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                    Loading registrations...
                                </TableCell>
                            </TableRow>
                        ) : participants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center text-sm text-slate-500">
                                    {search || filter !== "all"
                                        ? "No registrations match your search."
                                        : "No one has registered for this auction yet."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            participants.map((participant) => (
                                <ParticipantRow
                                    key={participant.uuid}
                                    participant={participant}
                                    auctionUuid={auctionUuid}
                                    lots={lots}
                                    canManage={canManage}
                                    selected={selected.has(participant.uuid)}
                                    busy={updating.has(participant.uuid)}
                                    onSelect={(checked) => toggleOne(participant.uuid, checked)}
                                    onVerify={(verified) => setVerified([participant.uuid], verified)}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                    <Legend status="VERIFIED" label="Verified to bid" />
                    <Legend status="PENDING" label="Awaiting verification" />
                    <Legend status={null} label="Not registered for lot" />
                    <span className="text-slate-400">Click a lot to verify bidders on that lot only.</span>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center gap-3">
                        <span>
                            Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
                        </span>
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
                )}
            </div>

            <AlertDialog
                open={confirmRemove !== null}
                onOpenChange={(open) => {
                    if (!open && !busy) setConfirmRemove(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Remove {confirmRemove?.length === 1 ? "this user" : `${confirmRemove?.length} users`} from the
                            auction?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Their registration and their verification on every lot of this auction are deleted, so they
                            can no longer bid here. Bids they already placed are kept. They can be added again later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmRemove && remove(confirmRemove)}
                            disabled={busy}
                            className="bg-red-600 text-white hover:bg-red-600/90"
                        >
                            {busy ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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

const StatCard = ({ label, value, tone = "slate" }: { label: string; value?: number; tone?: "slate" | "amber" }) => (
    <div className="rounded-[8px] border border-slate-200 bg-white px-5 py-4">
        <p className="text-[12px] text-slate-500">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold", tone === "amber" ? "text-amber-600" : "text-slate-800")}>
            {value ?? "—"}
        </p>
    </div>
);

const AUCTION_TYPE_LABEL: Record<ParticipantAuction["auctionType"], string> = {
    LIVE: "Live",
    FLOOR: "Floor",
    HYBRID: "Hybrid",
};

const OverviewField = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-0.5 text-[13px] font-medium text-slate-800">{value}</dd>
    </div>
);

/** The auction this page is about — dates, registration window, lot count */
const AuctionOverview = ({ auction, lotCount }: { auction: ParticipantAuction; lotCount: number }) => (
    <section className="flex flex-col gap-5 rounded-[8px] border border-slate-200 bg-white p-5 sm:flex-row">
        <div className="h-28 w-full shrink-0 overflow-hidden rounded-md bg-slate-100 sm:w-44">
            {auction.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={auction.coverImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
                <div className="flex h-full items-center justify-center text-slate-300">
                    <ImageOff className="h-6 w-6" />
                </div>
            )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full text-[11px] font-medium">
                    {AUCTION_STATUS_LABELS[auction.status]}
                </Badge>
                <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-medium text-[#833b61]">
                    {AUCTION_TYPE_LABEL[auction.auctionType]} Auction
                </span>
                <span className="text-[12px] text-slate-500">{toTitle(auction.visibility)}</span>
            </div>
            <p className="truncate text-base font-semibold text-slate-900">{auction.title}</p>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                <OverviewField label="Starts (IST)" value={formatDateTime(auction.startTime)} />
                <OverviewField label="Ends (IST)" value={formatDateTime(auction.endTime)} />
                <OverviewField
                    label="Registration window (IST)"
                    value={
                        auction.registrationRequired
                            ? `${formatDateTime(auction.registrationStarts)} → ${formatDateTime(auction.registrationDeadline)}`
                            : "Not required"
                    }
                />
                <OverviewField label="Lots" value={String(lotCount)} />
            </dl>
        </div>
    </section>
);

/** One lot: how many registrants, how many verified to bid */
const LotRegistrationCard = ({ lot, auctionUuid }: { lot: ParticipantLot; auctionUuid: string }) => {
    const { registered, verified, pending } = lot.bidders;
    const verifiedPct = registered ? Math.round((verified / registered) * 100) : 0;

    return (
        <Link
            href={`/dashboard/auctions/${auctionUuid}/lots/${lot.uuid}/bidders`}
            className="group flex gap-3 rounded-[8px] border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                {lot.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lot.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageOff className="h-4 w-4" />
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="rounded bg-[#fce8f1] px-1.5 py-0.5 text-[10px] font-semibold text-[#833b61]">
                        Lot {lot.itemNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">{toTitle(lot.status)}</span>
                </div>
                <p className="mt-1 truncate text-[13px] font-medium text-slate-800">{lot.title}</p>
                <p className="text-[11px] text-slate-500">
                    {registered} registered · <span className="text-emerald-700">{verified} verified</span>
                    {pending > 0 && (
                        <>
                            {" "}
                            · <span className="text-amber-600">{pending} awaiting</span>
                        </>
                    )}
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${verifiedPct}%` }} />
                </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-300 group-hover:text-slate-500" />
        </Link>
    );
};

const LOT_CHIP_STYLES: Record<LotBidderStatus | "NONE", string> = {
    VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    NONE: "border-slate-200 bg-white text-slate-400",
};

const Legend = ({ status, label }: { status: LotBidderStatus | null; label: string }) => (
    <span className="inline-flex items-center gap-1.5">
        <span className={cn("h-2.5 w-2.5 rounded-sm border", LOT_CHIP_STYLES[status ?? "NONE"])} />
        {label}
    </span>
);

const ParticipantRow = ({
    participant,
    auctionUuid,
    lots,
    canManage,
    selected,
    busy,
    onSelect,
    onVerify,
}: {
    participant: AuctionParticipant;
    auctionUuid: string;
    lots: ParticipantLot[];
    /** Super admin and the auction is still open */
    canManage: boolean;
    selected: boolean;
    busy: boolean;
    onSelect: (checked: boolean) => void;
    onVerify: (verified: boolean) => void;
}) => {
    const { byLot, verified, allVerified } = lotProgress(participant, lots);
    const kycVerified = participant.kycStatus === "VERIFIED";
    const initials = (participant.name || participant.username).slice(0, 2).toUpperCase();

    return (
        <TableRow className={cn(selected && "bg-slate-50")}>
            {canManage && (
                <TableCell className="px-3">
                    <Checkbox
                        checked={selected}
                        onCheckedChange={(value) => onSelect(!!value)}
                        aria-label={`Select ${participant.username}`}
                    />
                </TableCell>
            )}

            {/* Paddle */}
            <TableCell className="px-3">
                <PaddleBadge number={participant.paddleNumber} />
            </TableCell>

            {/* User */}
            <TableCell className="px-3">
                <div className="flex min-w-55 items-center gap-3">
                    {participant.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={participant.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                            {initials}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-800">
                            {participant.name || participant.username}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                            @{participant.username} · {participant.email}
                        </p>
                    </div>
                </div>
            </TableCell>

            {/* KYC */}
            <TableCell className="px-3">
                <KycBadge status={participant.kycStatus} />
            </TableCell>

            {/* How / when they registered */}
            <TableCell className="px-3 text-[11px] whitespace-nowrap">
                <span
                    className={cn(
                        "rounded px-2 py-0.5",
                        participant.source === "SELF_REGISTERED" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                    )}
                >
                    {participant.source === "SELF_REGISTERED" ? "Self" : "By admin"}
                </span>
                <p className="mt-1 text-slate-400">{formatDate(participant.registeredAt)}</p>
                {participant.status === "APPROVED" ? (
                    <p className="mt-0.5 text-emerald-700" title={formatDateTime(participant.approvedAt)}>
                        Approved{participant.approvedBy ? ` by @${participant.approvedBy}` : ""}
                    </p>
                ) : (
                    <p className="mt-0.5 text-amber-600">Approval pending</p>
                )}
            </TableCell>

            {/* Per-lot status */}
            <TableCell className="px-3">
                <div className="flex max-w-md flex-wrap gap-1">
                    {lots.length === 0 ? (
                        <span className="text-[11px] text-slate-400">No lots</span>
                    ) : (
                        lots.map((lot) => {
                            const status = byLot.get(lot.uuid);
                            return (
                                <Link
                                    key={lot.uuid}
                                    href={`/dashboard/auctions/${auctionUuid}/lots/${lot.uuid}/bidders`}
                                    title={`Lot ${lot.itemNumber}: ${lot.title} — ${
                                        status === "VERIFIED" ? "verified" : status === "PENDING" ? "awaiting verification" : "not registered"
                                    }`}
                                    className={cn(
                                        "rounded border px-1.5 py-0.5 text-[10px] font-medium hover:opacity-80",
                                        LOT_CHIP_STYLES[status ?? "NONE"]
                                    )}
                                >
                                    {lot.itemNumber}
                                </Link>
                            );
                        })
                    )}
                </div>
                {lots.length > 0 && (
                    <p className="mt-1 text-[11px] text-slate-400">
                        Verified on {verified} of {lots.length} lot{lots.length === 1 ? "" : "s"}
                    </p>
                )}
            </TableCell>

            {/* Action */}
            {canManage && (
                <TableCell className="px-3 text-right">
                    {allVerified ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 min-w-28 text-xs"
                            disabled={busy}
                            onClick={() => onVerify(false)}
                        >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Unverify all"}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            className="h-8 min-w-28 bg-[#491B3A] text-xs text-white hover:bg-[#491B3A]/90"
                            disabled={busy || !kycVerified || lots.length === 0}
                            title={kycVerified ? undefined : "KYC must be verified before they can bid"}
                            onClick={() => onVerify(true)}
                        >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify all lots"}
                        </Button>
                    )}
                </TableCell>
            )}
        </TableRow>
    );
};
