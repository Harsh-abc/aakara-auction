"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, Pencil, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";

import type { Auction, AuctionStatus } from "@/lib/types/auction.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; // shadcn wrapper, NOT "@base-ui/react"

// =====================================================================
// ROW ACTION HANDLERS (passed from the page via table `meta`)
// =====================================================================

export interface AuctionTableMeta {
    onEdit?: (auction: Auction) => void;
    onView?: (auction: Auction) => void;
    onDelete?: (auction: Auction) => void;
}

// =====================================================================
// FORMATTERS (always show IST, whatever the admin's machine timezone)
// =====================================================================

const dateFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
});

const timeFmt = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
});

const formatDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—");
const formatTime = (iso?: string | null) => (iso ? timeFmt.format(new Date(iso)) : "");

// =====================================================================
// BADGES
// =====================================================================

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

const TYPE_LABEL: Record<Auction["auctionType"], string> = {
    LIVE: "Live",
    FLOOR: "Floor",
    HYBRID: "Hybrid",
};

const toTitle = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const SortHeader = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-slate-900"
    >
        {label}
        <ArrowUpDown className="h-3 w-3" />
    </button>
);

// =====================================================================
// COLUMNS
// =====================================================================

export const columns: ColumnDef<Auction>[] = [
    {
        accessorKey: "title",
        header: ({ column }) => (
            <SortHeader
                label="Auction"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ row }) => {
            const a = row.original;
            return (
                <div className="flex min-w-[220px] items-center gap-3">
                    <div className="h-9 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {a.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-800">{a.title}</p>
                        <p className="truncate text-[11px] text-slate-400">{a.slug}</p>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "auctionType",
        header: "Type",
        filterFn: "equals",
        cell: ({ row }) => (
            <span className="rounded bg-[#fce8f1] px-2 py-1 text-[11px] font-medium text-[#833b61]">
                {TYPE_LABEL[row.original.auctionType] ?? row.original.auctionType}
            </span>
        ),
    },
    {
        id: "category",
        accessorFn: (a) => a.category?.name ?? "",
        header: "Category",
        cell: ({ row }) => (
            <span className="text-[12px] text-slate-600">
                {row.original.category?.name ?? "—"}
                {row.original.subCategory?.name ? ` / ${row.original.subCategory.name}` : ""}
            </span>
        ),
    },
    {
        id: "lots",
        accessorFn: (a) => a._count?.items ?? 0,
        enableGlobalFilter: false,
        header: ({ column }) => (
            <SortHeader
                label="Lots"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ getValue }) => (
            <span className="text-[12px] font-semibold text-slate-700">{getValue<number>()}</span>
        ),
    },
    {
        accessorKey: "startTime",
        enableGlobalFilter: false,
        sortingFn: "datetime",
        header: ({ column }) => (
            <SortHeader
                label="Starts"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ row }) => (
            <div className="whitespace-nowrap text-[12px]">
                <p className="text-slate-700">{formatDate(row.original.startTime)}</p>
                <p className="text-slate-400">{formatTime(row.original.startTime)}</p>
            </div>
        ),
        // Used by the date-range filter in AuctionDataTable
        filterFn: (row, columnId, range: DateRange | undefined) => {
            if (!range?.from) return true;
            const value = new Date(row.getValue<string>(columnId));
            const from = new Date(range.from);
            from.setHours(0, 0, 0, 0);
            const to = new Date(range.to ?? range.from);
            to.setHours(23, 59, 59, 999);
            return value >= from && value <= to;
        },
    },
    {
        accessorKey: "endTime",
        header: "Ends",
        enableGlobalFilter: false,
        cell: ({ row }) => (
            <div className="whitespace-nowrap text-[12px]">
                <p className="text-slate-700">{formatDate(row.original.endTime)}</p>
                <p className="text-slate-400">{formatTime(row.original.endTime)}</p>
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        filterFn: "equals",
        enableGlobalFilter: false,
        cell: ({ row }) => {
            const status = row.original.status;
            return (
                <span
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
                    )}
                >
                    {status === "LIVE" && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    )}
                    {toTitle(status)}
                </span>
            );
        },
    },
    {
        accessorKey: "visibility",
        header: "Visibility",
        enableGlobalFilter: false,
        cell: ({ row }) => (
            <span className="text-[11px] text-slate-500">
                {row.original.visibility === "PUBLIC"
                    ? "Public"
                    : row.original.visibility === "PRIVATE_INVITE_ONLY"
                        ? "Invite only"
                        : "Registered"}
            </span>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row, table }) => {
            const auction = row.original;
            const meta = table.options.meta as AuctionTableMeta | undefined;
            const canDelete = auction.status === "DRAFT";

            return (
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit"
                        aria-label="Edit auction"
                        onClick={() => meta?.onEdit?.(auction)}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="View"
                        aria-label="View auction"
                        onClick={() => meta?.onView?.(auction)}
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        title={canDelete ? "Delete" : "Only drafts can be deleted"}
                        aria-label="Delete auction"
                        disabled={!canDelete}
                        onClick={() => meta?.onDelete?.(auction)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            );
        },
    },
];