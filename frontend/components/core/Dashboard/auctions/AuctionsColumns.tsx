"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/lib/table-features";
import { ArrowUpDown, Eye, Loader2, MoreVertical, Pencil, Trash2, Users } from "lucide-react";
import type { DateRange } from "react-day-picker";

import type { Auction, AuctionStatus } from "@/lib/types/auction.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; // shadcn wrapper, NOT "@base-ui/react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import AuctionStatusControl from "./AuctionStatusControl";

// =====================================================================
// ROW ACTION HANDLERS (passed from the page via table `meta`)
// =====================================================================

export interface AuctionTableMeta {
    onEdit?: (auction: Auction) => void;
    onView?: (auction: Auction) => void;
    onDelete?: (auction: Auction) => void;
    /** Shown in the row menu only when set (super admin / admin) */
    onRegistrations?: (auction: Auction) => void;
    deletingUuid?: string | null;
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

/** Why a menu action is disabled, shown at the item's right edge */
const MenuHint = ({ children }: { children: string }) => (
    <span className="ml-auto pl-2 text-[10px] text-slate-400">{children}</span>
);

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

export const columns: ColumnDef<AppTableFeatures, Auction>[] = [
    {
        accessorKey: "title",
        size: 300,
        header: ({ column }) => (
            <SortHeader
                label="Auction"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ row }) => {
            const a = row.original;
            return (
                <div className="flex w-full min-w-0 items-center gap-3">
                    <div className="h-9 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {a.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-800" title={a.title}>{a.title}</p>
                        <p className="truncate text-[11px] text-slate-400">{a.slug}</p>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "auctionType",
        size: 80,
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
        size: 180,
        cell: ({ row }) => (
            <div className="flex flex-col">
                <p className="text-[12px] text-slate-600">
                    {row.original.category?.name ?? "—"}
                </p>
                <p className="text-[12px] text-slate-600">
                    {row.original.subCategory?.name ? ` / ${row.original.subCategory.name}` : ""}
                </p>
            </div>
        ),
    },
    {
        id: "lots",
        size: 60,
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
        size: 115,
        enableGlobalFilter: false,
        sortFn: "datetime",
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
        size: 115,
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
        size: 105,
        header: "Status",
        filterFn: "equals",
        enableGlobalFilter: false,
        cell: ({ row }) => {
            const status = row.original.status;
            const badge = (
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

            // SUPER_ADMIN gets a dropdown; everyone else sees the badge
            return <AuctionStatusControl auction={row.original} badge={badge} />;
        },
    },
    // {
    //     accessorKey: "visibility",
    //     header: "Visibility",
    //     enableGlobalFilter: false,
    //     cell: ({ row }) => (
    //         <span className="text-[11px] text-slate-500">
    //             {row.original.visibility === "PUBLIC"
    //                 ? "Public"
    //                 : row.original.visibility === "PRIVATE_INVITE_ONLY"
    //                     ? "Invite only"
    //                     : "Registered"}
    //         </span>
    //     ),
    // },
    {
        id: "actions",
        size: 70,
        header: "Actions",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row, table }) => {
            const auction = row.original;
            const meta = table.options.meta as AuctionTableMeta | undefined;
            const canDelete = auction.status === "DRAFT";
            const canEdit = auction.status === "DRAFT" || auction.status === "SCHEDULED";
            const deleting = meta?.deletingUuid === auction.uuid;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-900 data-popup-open:bg-slate-100"
                                aria-label={`Actions for ${auction.title}`}
                            />
                        }
                    >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="py-2 text-[13px]" onClick={() => meta?.onView?.(auction)}>
                            <Eye />
                            View lots
                        </DropdownMenuItem>

                        {meta?.onRegistrations && (
                            <DropdownMenuItem className="py-2 text-[13px]" onClick={() => meta.onRegistrations?.(auction)}>
                                <Users />
                                Registrations
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                            className="py-2 text-[13px]"
                            disabled={!canEdit}
                            onClick={() => meta?.onEdit?.(auction)}
                        >
                            <Pencil />
                            Edit auction
                            {!canEdit && <MenuHint>Draft / scheduled only</MenuHint>}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            variant="destructive"
                            className="py-2 text-[13px]"
                            disabled={!canDelete || deleting}
                            onClick={() => meta?.onDelete?.(auction)}
                        >
                            <Trash2 />
                            Delete auction
                            {!canDelete && <MenuHint>Draft only</MenuHint>}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];