"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AppTableFeatures } from "@/lib/table-features";
import { ArrowUpDown, ImageIcon, Loader2, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AuctionLot, AuctionStatus, LotStatus } from "@/lib/types/auction.types";
import { formatMoney } from "@/lib/types/LotRow";
import { cn } from "@/lib/utils";

// =====================================================================
// ROW CONTROLS (passed from the page via table `meta`)
// =====================================================================

export interface LiveLotTableMeta {
    /** Status of the auction these lots belong to (lots start only when LIVE) */
    auctionStatus?: AuctionStatus;
    /** Can the viewer start / stop lots */
    canControl?: boolean;
    /** The auction's live lot — only one at a time */
    liveLot?: { uuid: string; itemNumber: string } | null;
    /** Lot being started / stopped */
    controllingUuid?: string | null;
    onStart?: (lot: AuctionLot) => void;
    onStop?: (lot: AuctionLot) => void;
}

/** Mirrors STARTABLE_LOT_STATUSES in backend/src/services/liveAuction.services.js */
const STARTABLE: LotStatus[] = ["DRAFT", "SCHEDULED", "UNSOLD"];

// IST, like the other auction tables
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

const DateTimeCell = ({ iso }: { iso?: string | null }) =>
    iso ? (
        <div className="whitespace-nowrap text-[12px]">
            <p className="text-slate-700">{dateFmt.format(new Date(iso))}</p>
            <p className="text-slate-400">{timeFmt.format(new Date(iso))}</p>
        </div>
    ) : (
        <span className="text-[12px] text-slate-400">—</span>
    );

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

export const columns: ColumnDef<AppTableFeatures, AuctionLot>[] = [
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
        id: "startsAt",
        size: 115,
        accessorFn: (l) => new Date(l.scheduledStartAt).getTime() || 0,
        enableGlobalFilter: false,
        header: ({ column }) => (
            <SortHeader
                label="Starts"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ row }) => <DateTimeCell iso={row.original.scheduledStartAt} />,
    },
    {
        id: "endsAt",
        size: 115,
        accessorFn: (l) => new Date(l.scheduledEndAt).getTime() || 0,
        enableGlobalFilter: false,
        header: ({ column }) => (
            <SortHeader
                label="Ends"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
        ),
        cell: ({ row }) => <DateTimeCell iso={row.original.scheduledEndAt} />,
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
    {
        id: "controls",
        size: 120,
        header: "Controls",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row, table }) => {
            const lot = row.original;
            const meta = table.options.meta as LiveLotTableMeta | undefined;
            if (!meta?.canControl) return <span className="text-[11px] text-slate-400">—</span>;

            const busy = meta.controllingUuid === lot.uuid;
            const anyBusy = Boolean(meta.controllingUuid);

            // Live lot -> Stop
            if (lot.status === "ACTIVE") {
                return (
                    <Button
                        type="button"
                        className="h-8 gap-1.5 bg-red-600 px-3 text-xs text-white hover:bg-red-700"
                        disabled={anyBusy}
                        onClick={() => meta.onStop?.(lot)}
                    >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3 w-3 fill-current" />}
                        Stop
                    </Button>
                );
            }

            if (!STARTABLE.includes(lot.status)) {
                return <span className="text-[11px] text-slate-400">Closed</span>;
            }

            // One live lot per auction, and only while the auction is LIVE
            const auctionLive = meta.auctionStatus === "LIVE";
            const otherLive = meta.liveLot && meta.liveLot.uuid !== lot.uuid ? meta.liveLot : null;
            const blockedReason = !auctionLive
                ? `The auction is ${toTitle(meta.auctionStatus ?? "not live")} — set it to Live to start lots`
                : otherLive
                    ? `Lot #${otherLive.itemNumber} is live — stop it first`
                    : undefined;

            return (
                <Button
                    type="button"
                    variant="outline"
                    className="h-8 gap-1.5 border-emerald-300 px-3 text-xs text-emerald-700 hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-400"
                    title={blockedReason ?? "Make this lot live"}
                    disabled={Boolean(blockedReason) || anyBusy}
                    onClick={() => meta.onStart?.(lot)}
                >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                    Start
                </Button>
            );
        },
    },
];
