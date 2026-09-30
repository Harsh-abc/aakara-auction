"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ImageIcon } from "lucide-react";

import type { AuctionLot, LotStatus } from "@/lib/types/auction.types";
import { formatMoney } from "@/lib/types/LotRow";
import { cn } from "@/lib/utils";

// =====================================================================
// HELPERS
// =====================================================================

/** Prisma Decimal columns arrive as strings */
const toNumber = (v?: string | number | null): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const currencyOf = (lot: AuctionLot) => lot.currency?.code ?? "INR";

const primaryImage = (lot: AuctionLot) => {
    const images = lot.images?.filter((m) => m.mediaType === "IMAGE") ?? [];
    return images.find((m) => m.isPrimary) ?? images[0];
};

const toTitle = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

// =====================================================================
// BADGES
// =====================================================================

const STATUS_STYLES: Record<LotStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-blue-50 text-blue-700",
    ACTIVE: "bg-emerald-50 text-emerald-700",
    SOLD: "bg-teal-50 text-teal-700",
    UNSOLD: "bg-slate-200 text-slate-700",
    PASSED: "bg-slate-200 text-slate-700",
    WITHDRAWN: "bg-red-50 text-red-600",
};

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

export const columns: ColumnDef<AuctionLot>[] = [
    {
        id: "lot",
        size: 220,
        accessorFn: (l) => Number(l.itemNumber) || 0,
        header: ({ column }) => (
            <SortHeader
                label="Lots"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ row }) => {
            const lot = row.original;
            return (
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500">
                        #{String(lot.itemNumber).padStart(2, "0")}
                    </p>
                    <p className="truncate text-[13px] font-semibold text-slate-800" title={lot.title}>
                        {lot.title || "Untitled lot"}
                    </p>
                </div>
            );
        },
    },
    {
        id: "image",
        size: 80,
        header: "Images",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => {
            const image = primaryImage(row.original);
            return (
                <div className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-slate-50">
                    {image?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image.url} alt={row.original.title} className="h-full w-full object-cover" />
                    ) : (
                        <ImageIcon className="h-4 w-4 text-slate-300" />
                    )}
                </div>
            );
        },
    },
    {
        id: "artist",
        size: 160,
        accessorFn: (l) => l.artistName ?? "",
        header: "Artist",
        cell: ({ row }) => (
            <p
                className="truncate text-[12px] text-slate-700"
                title={row.original.artistName ?? undefined}
            >
                {row.original.artistName || "Unknown artist"}
            </p>
        ),
    },
    {
        id: "basePrice",
        size: 120,
        accessorFn: (l) => toNumber(l.startingPrice) ?? 0,
        enableGlobalFilter: false,
        header: ({ column }) => (
            <SortHeader
                label="Base Price"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ row }) => (
            <span className="whitespace-nowrap text-[12px] text-slate-600">
                {formatMoney(toNumber(row.original.startingPrice), currencyOf(row.original))}
            </span>
        ),
    },
    {
        id: "currentPrice",
        size: 130,
        accessorFn: (l) => toNumber(l.currentBid) ?? 0,
        enableGlobalFilter: false,
        header: ({ column }) => (
            <SortHeader
                label="Current Price"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ row }) => {
            const lot = row.original;
            const bids = Number(lot.bidCount ?? 0);
            return (
                <div className="whitespace-nowrap text-[12px]">
                    <p className="font-semibold text-slate-800">
                        {formatMoney(toNumber(lot.currentBid), currencyOf(lot))}
                    </p>
                    <p className="text-[11px] text-slate-400">
                        {bids} {bids === 1 ? "bid" : "bids"}
                    </p>
                </div>
            );
        },
    },
    {
        accessorKey: "status",
        size: 105,
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
                    {status === "ACTIVE" && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    )}
                    {toTitle(status)}
                </span>
            );
        },
    },
];
