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
    Phone,
    PhoneCall,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    setPhoneInterest,
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
    { value: "phone", label: "Phone bidders" },
];

const dateFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const formatDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—");

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
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
    // phone bidder whose phone lots are being picked
    const [pickingPhoneLots, setPickingPhoneLots] = useState<AuctionParticipant | null>(null);
    const [savingPhoneLots, setSavingPhoneLots] = useState(false);

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

    const savePhoneLots = async (userUuid: string, lotUuids: string[]) => {
        setSavingPhoneLots(true);
        try {
            const res = await dispatch(setPhoneInterest({ auctionUuid, userUuid, lotUuids })).unwrap();
            toast.success(res.message);
            setPickingPhoneLots(null);
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Could not save the phone lots. Try again.");
        } finally {
            setSavingPhoneLots(false);
        }
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
                    <h3 className="text-2xl font-bold">Manage Bidders</h3>
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
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatCard label="Registered" value={summary?.total} />
                <StatCard label="Self-registered" value={summary?.selfRegistered} />
                <StatCard label="Added by admin" value={summary?.addedByAdmin} />
                <StatCard label="Awaiting verification" value={summary?.awaiting} tone="amber" />
                <StatCard label="Phone bidders" value={summary?.phoneBidders} tone="purple" />
            </div>

            {isSuperAdmin && !auctionOpen && (
                <div className="flex items-start gap-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    The auction is {AUCTION_STATUS_LABELS[current.status]}, so registrations can no longer be changed.
                </div>
            )}

            {/* Lot-wise */}
            <LotRegistrations lots={lots} auctionUuid={auctionUuid} />

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
                            {["Paddle", "User", "KYC", "Registered", "Terms", "Lots", "Phone lots", ...(canManage ? [""] : [])].map((h, i) => (
                                <TableHead key={i} className="h-9 px-3 text-[11px] font-medium whitespace-nowrap text-slate-700">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading && participants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-40 text-center text-sm text-slate-500">
                                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                    Loading registrations...
                                </TableCell>
                            </TableRow>
                        ) : participants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-40 text-center text-sm text-slate-500">
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
                                    onPickPhoneLots={() => setPickingPhoneLots(participant)}
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

            <PhoneLotsDialog
                participant={pickingPhoneLots}
                lots={lots}
                saving={savingPhoneLots}
                onClose={() => !savingPhoneLots && setPickingPhoneLots(null)}
                onSave={(lotUuids) => pickingPhoneLots && savePhoneLots(pickingPhoneLots.uuid, lotUuids)}
            />

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

const STAT_TONE = { slate: "text-slate-800", amber: "text-amber-600", purple: "text-purple-700" };

const StatCard = ({ label, value, tone = "slate" }: { label: string; value?: number; tone?: keyof typeof STAT_TONE }) => (
    <div className="rounded-[8px] border border-slate-200 bg-white px-5 py-4">
        <p className="text-[12px] text-slate-500">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold", STAT_TONE[tone])}>
            {value ?? "—"}
        </p>
    </div>
);

const AUCTION_TYPE_LABEL: Record<ParticipantAuction["auctionType"], string> = {
    LIVE: "Live",
    ONLINE: "Online",
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
                <OverviewField label="Starts" value={formatDateTime(auction.startTime)} />
                <OverviewField label="Ends" value={formatDateTime(auction.endTime)} />
                <OverviewField
                    label="Registration window"
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

/**
 * Registrations by lot — compact so 100+ lots don't push the bidders table far down: small tiles
 * in a dense grid, a fixed height that scrolls inside, an "awaiting only" filter and a collapse toggle.
 */
const LotRegistrations = ({ lots, auctionUuid }: { lots: ParticipantLot[]; auctionUuid: string }) => {
    const [open, setOpen] = useState(true);
    const [awaitingOnly, setAwaitingOnly] = useState(false);

    const totals = lots.reduce(
        (sum, lot) => ({
            verified: sum.verified + lot.bidders.verified,
            pending: sum.pending + lot.bidders.pending,
            lotsAwaiting: sum.lotsAwaiting + (lot.bidders.pending > 0 ? 1 : 0),
        }),
        { verified: 0, pending: 0, lotsAwaiting: 0 }
    );
    const shown = awaitingOnly ? lots.filter((lot) => lot.bidders.pending > 0) : lots;

    return (
        <section className="rounded-[8px] border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="flex cursor-pointer items-center gap-2 text-left"
                    aria-expanded={open}
                >
                    <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-90")} />
                    <h4 className="text-base font-semibold text-slate-900">Registrations by lot</h4>
                    <span className="text-[12px] text-slate-500">
                        {lots.length} lot{lots.length === 1 ? "" : "s"}
                        {totals.lotsAwaiting > 0 ? (
                            <span className="text-amber-600">
                                {" "}
                                · {totals.pending} awaiting on {totals.lotsAwaiting} lot{totals.lotsAwaiting === 1 ? "" : "s"}
                            </span>
                        ) : (
                            lots.length > 0 && <span className="text-emerald-700"> · everyone verified</span>
                        )}
                    </span>
                </button>

                {open && totals.lotsAwaiting > 0 && (
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                        <Checkbox checked={awaitingOnly} onCheckedChange={(value) => setAwaitingOnly(!!value)} />
                        Only lots awaiting verification
                    </label>
                )}
            </div>

            {open && (
                <div className="border-t border-slate-100 p-3">
                    {lots.length === 0 ? (
                        <p className="py-4 text-center text-[13px] text-slate-400">
                            This auction has no lots yet. Registrants are added to lots automatically when lots are added.
                        </p>
                    ) : (
                        <div className="grid max-h-56 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 overflow-y-auto pr-1">
                            {shown.map((lot) => (
                                <LotRegistrationTile key={lot.uuid} lot={lot} auctionUuid={auctionUuid} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

/** One lot as a small tile: number, verified / registered, progress. Title and status on hover */
const LotRegistrationTile = ({ lot, auctionUuid }: { lot: ParticipantLot; auctionUuid: string }) => {
    const { registered, verified, pending } = lot.bidders;
    const verifiedPct = registered ? Math.round((verified / registered) * 100) : 0;

    return (
        <Link
            href={`/dashboard/auctions/${auctionUuid}/lots/${lot.uuid}/bidders`}
            title={`Lot ${lot.itemNumber}: ${lot.title} (${toTitle(lot.status)})\n${registered} registered · ${verified} verified${
                pending ? ` · ${pending} awaiting` : ""
            }`}
            className={cn(
                "group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors hover:bg-slate-50",
                pending > 0 ? "border-amber-200 bg-amber-50/40" : "border-slate-200"
            )}
        >
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-slate-100">
                {lot.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lot.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageOff className="h-3 w-3" />
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[11px] font-semibold text-[#833b61]">Lot {lot.itemNumber}</span>
                    <span className="text-[10px] tabular-nums text-slate-500">
                        <span className="text-emerald-700">{verified}</span>/{registered}
                    </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${verifiedPct}%` }} />
                </div>
                {pending > 0 && <p className="mt-0.5 text-[10px] text-amber-600">{pending} awaiting</p>}
            </div>
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

/** Lots of the auction, in order, that a phone bidder picked (verified lots only) */
const phoneLotsOf = (participant: AuctionParticipant, lots: ParticipantLot[]) => {
    const picked = new Set(participant.lots.filter((l) => l.phoneInterest).map((l) => l.lotUuid));
    return lots.filter((lot) => picked.has(lot.uuid));
};

const PhoneLotsCell = ({
    participant,
    lots,
    verifiedCount,
    canManage,
    onPick,
}: {
    participant: AuctionParticipant;
    lots: ParticipantLot[];
    verifiedCount: number;
    canManage: boolean;
    onPick: () => void;
}) => {
    if (!participant.isPhoneBidder) return <span className="text-[11px] text-slate-300">—</span>;

    const picked = phoneLotsOf(participant, lots);

    return (
        <div className="flex min-w-36 flex-col items-start gap-1">
            {picked.length === 0 ? (
                <span className="text-[11px] text-slate-400">No lots picked</span>
            ) : (
                <div className="flex max-w-56 flex-wrap gap-1">
                    {picked.map((lot) => (
                        <span
                            key={lot.uuid}
                            title={`Lot ${lot.itemNumber}: ${lot.title}`}
                            className="inline-flex items-center gap-0.5 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700"
                        >
                            <Phone className="h-2.5 w-2.5" />
                            {lot.itemNumber}
                        </span>
                    ))}
                </div>
            )}
            {canManage &&
                (verifiedCount === 0 ? (
                    <span className="text-[11px] text-amber-600">Verify them on a lot first</span>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        className="h-7 border-purple-200 px-2 text-[11px] text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                        onClick={onPick}
                    >
                        <PhoneCall className="mr-1 h-3 w-3" />
                        {picked.length === 0 ? "Select lots" : "Edit lots"}
                    </Button>
                ))}
        </div>
    );
};

/** Pick the verified lots a phone bidder wants to bid on over the phone */
const PhoneLotsDialog = ({
    participant,
    lots,
    saving,
    onClose,
    onSave,
}: {
    participant: AuctionParticipant | null;
    lots: ParticipantLot[];
    saving: boolean;
    onClose: () => void;
    onSave: (lotUuids: string[]) => void;
}) => {
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [openFor, setOpenFor] = useState<string | null>(null);

    // start from their current pick each time the dialog opens for someone
    if (participant && openFor !== participant.uuid) {
        setOpenFor(participant.uuid);
        setPicked(new Set(phoneLotsOf(participant, lots).map((lot) => lot.uuid)));
    } else if (!participant && openFor !== null) {
        setOpenFor(null);
    }

    const statusByLot = new Map(participant?.lots.map((l) => [l.lotUuid, l.status]) ?? []);
    const verifiedLots = lots.filter((lot) => statusByLot.get(lot.uuid) === "VERIFIED");
    const allPicked = verifiedLots.length > 0 && verifiedLots.every((lot) => picked.has(lot.uuid));

    const toggle = (uuid: string, checked: boolean) =>
        setPicked((prev) => {
            const next = new Set(prev);
            if (checked) next.add(uuid);
            else next.delete(uuid);
            return next;
        });

    return (
        <Dialog open={participant !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Phone lots</DialogTitle>
                    <DialogDescription>
                        Pick the lots <b>{participant?.name || participant?.username}</b> (paddle #
                        {participant?.paddleNumber}) wants to bid on over the phone. Only lots they&apos;re verified for
                        are listed.
                    </DialogDescription>
                </DialogHeader>

                {verifiedLots.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                        They aren&apos;t verified on any lot yet. Verify them first.
                    </p>
                ) : (
                    <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 pb-2 text-[13px] font-medium text-slate-700">
                            <Checkbox
                                checked={allPicked}
                                onCheckedChange={(value) =>
                                    setPicked(value ? new Set(verifiedLots.map((lot) => lot.uuid)) : new Set())
                                }
                            />
                            All verified lots ({verifiedLots.length})
                        </label>
                        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                            {verifiedLots.map((lot) => (
                                <label
                                    key={lot.uuid}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                                        picked.has(lot.uuid) ? "border-purple-200 bg-purple-50" : "border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <Checkbox
                                        checked={picked.has(lot.uuid)}
                                        onCheckedChange={(value) => toggle(lot.uuid, !!value)}
                                    />
                                    <span className="rounded bg-[#fce8f1] px-1.5 py-0.5 text-[10px] font-semibold text-[#833b61]">
                                        Lot {lot.itemNumber}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-[13px] text-slate-800">{lot.title}</span>
                                    {lot.artistName && (
                                        <span className="max-w-32 truncate text-[11px] text-slate-400">{lot.artistName}</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-purple-700 text-white hover:bg-purple-700/90"
                        disabled={saving || verifiedLots.length === 0}
                        onClick={() => onSave(verifiedLots.filter((lot) => picked.has(lot.uuid)).map((lot) => lot.uuid))}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Save (${picked.size})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ParticipantRow = ({
    participant,
    auctionUuid,
    lots,
    canManage,
    selected,
    busy,
    onSelect,
    onVerify,
    onPickPhoneLots,
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
    onPickPhoneLots: () => void;
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
                <PaddleBadge number={participant.paddleNumber} phone={participant.isPhoneBidder} />
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

            {/* Conditions of Sale acceptance */}
            <TableCell className="px-3 text-[11px] whitespace-nowrap">
                {participant.termsAcceptedAt ? (
                    <>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">Agreed</span>
                        <p className="mt-1 text-slate-500">{formatDateTime(participant.termsAcceptedAt)}</p>
                        <p className="mt-0.5 text-slate-400">
                            v{participant.termsVersion}
                            {participant.termsAcceptedIp ? ` · IP ${participant.termsAcceptedIp}` : ""}
                        </p>
                    </>
                ) : (
                    <>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">Not recorded</span>
                        <p className="mt-1 text-slate-400">
                            {participant.source === "ADDED_BY_ADMIN" ? "Added by admin" : "Registered before terms tracking"}
                        </p>
                    </>
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

            {/* Phone bidders: the verified lots they want to bid on over the phone */}
            <TableCell className="px-3">
                <PhoneLotsCell
                    participant={participant}
                    lots={lots}
                    verifiedCount={verified}
                    canManage={canManage}
                    onPick={onPickPhoneLots}
                />
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
