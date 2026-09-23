"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye, Trash2, ImageIcon, Film, FileText, AlertCircle, ArrowUpDown } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { LotRow, formatMoney } from '@/lib/types/LotRow'

type ColumnsProps = {
    /** Handlers receive the row index in the source array */
    onEdit?: (index: number) => void;
    onView?: (index: number) => void;
    onDelete?: (index: number) => void;
};

const EDITION_LABEL: Record<string, string> = {
    UNIQUE: "Unique",
    LIMITED: "Limited",
    OPEN: "Open",
};

const STATUS_STYLES: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
    SCHEDULED: "bg-blue-50 text-blue-600 border-blue-100",
    ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-100",
    SOLD: "bg-teal-50 text-teal-700 border-teal-100",
    UNSOLD: "bg-gray-100 text-gray-600 border-gray-200",
    PASSED: "bg-gray-100 text-gray-600 border-gray-200",
    WITHDRAWN: "bg-red-50 text-red-600 border-red-100",
};

const SortHeader = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-900">
        {label}
        <ArrowUpDown className="h-3 w-3" />
    </button>
);

export const getColumns = ({
    onEdit,
    onView,
    onDelete,
}: ColumnsProps = {}): ColumnDef<LotRow>[] => [
        // SELECT
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            enableGlobalFilter: false,
        },

        // LOT #
        {
            accessorKey: "lotNumber",
            header: ({ column }) => (
                <SortHeader label="Lot" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
            ),
            enableGlobalFilter: false,
            cell: ({ row }) => (
                <span className="text-[12px] font-semibold text-slate-500">
                    #{String(row.original.lotNumber).padStart(2, "0")}
                </span>
            ),
        },

        // IMAGE + TITLE + ARTIST
        {
            id: "artwork",
            accessorFn: (r) => `${r.title} ${r.artist} ${r.artworkId} ${r.medium}`,
            header: "Artwork",
            cell: ({ row }) => {
                const lot = row.original;

                return (
                    <div className="flex items-center gap-3 min-w-[240px]">
                        {lot.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={lot.thumbnail}
                                alt={lot.title || "Lot image"}
                                className="h-10 w-10 shrink-0 rounded-md object-cover border"
                            />
                        ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-slate-50">
                                <ImageIcon className="h-4 w-4 text-slate-300" />
                            </div>
                        )}

                        <div className="flex min-w-0 flex-col">
                            <span
                                className={`truncate text-[13px] font-medium ${lot.title ? "text-slate-800" : "italic text-slate-400"}`}
                                title={lot.title}
                            >
                                {lot.title || "Untitled lot"}
                            </span>

                            <span className="truncate text-[11px] text-muted-foreground">
                                {lot.artist || "Unknown artist"}
                                {lot.year && ` · ${lot.year}`}
                            </span>
                        </div>
                    </div>
                );
            },
        },

        // MEDIUM + EDITION
        {
            accessorKey: "medium",
            header: "Medium / Edition",
            cell: ({ row }) => (
                <div className="text-[12px] leading-tight">
                    <p className="max-w-[160px] truncate text-slate-700" title={row.original.medium}>
                        {row.original.medium || "—"}
                    </p>
                    {row.original.editionType && (
                        <p className="text-[11px] text-muted-foreground">
                            {EDITION_LABEL[row.original.editionType] ?? row.original.editionType}
                        </p>
                    )}
                </div>
            ),
        },

        // MEDIA / DOCS COUNT
        {
            id: "media",
            header: "Media",
            enableGlobalFilter: false,
            cell: ({ row }) => {
                const { imageCount, videoCount, documentCount } = row.original;
                return (
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1" title="Images">
                            <ImageIcon className="h-3.5 w-3.5" /> {imageCount}
                        </span>
                        {videoCount > 0 && (
                            <span className="inline-flex items-center gap-1" title="Videos">
                                <Film className="h-3.5 w-3.5" /> {videoCount}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1" title="Documents">
                            <FileText className="h-3.5 w-3.5" /> {documentCount}
                        </span>
                    </div>
                );
            },
        },

        // STARTING BID
        {
            accessorKey: "startingPrice",
            header: ({ column }) => (
                <SortHeader label="Starting Bid" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
            ),
            enableGlobalFilter: false,
            cell: ({ row }) => (
                <span className="text-[12px] font-medium whitespace-nowrap">
                    {formatMoney(row.original.startingPrice, row.original.currency)}
                </span>
            ),
        },

        // RESERVE
        {
            accessorKey: "reservePrice",
            header: "Reserve",
            enableGlobalFilter: false,
            cell: ({ row }) => (
                <span className="text-[12px] whitespace-nowrap text-slate-600">
                    {formatMoney(row.original.reservePrice, row.original.currency)}
                </span>
            ),
        },

        // ESTIMATE
        {
            id: "estimate",
            header: "Estimate",
            enableGlobalFilter: false,
            cell: ({ row }) => {
                const { estimateLow, estimateHigh, currency } = row.original;
                if (estimateLow === null && estimateHigh === null) {
                    return <span className="text-[12px] text-slate-400">—</span>;
                }
                return (
                    <span className="text-[12px] whitespace-nowrap text-slate-600">
                        {formatMoney(estimateLow, currency)} – {formatMoney(estimateHigh, currency)}
                    </span>
                );
            },
        },

        // STATUS / READINESS
        {
            id: "status",
            accessorFn: (r) => (r.source === "form" ? (r.missing.length ? "INCOMPLETE" : "READY") : r.status),
            header: "Status",
            filterFn: "equals",
            enableGlobalFilter: false,
            cell: ({ row }) => {
                const lot = row.original;

                // Lots in the create form: show whether they're ready to publish
                if (lot.source === "form") {
                    return lot.missing.length ? (
                        <Badge
                            variant="outline"
                            title={`Missing: ${lot.missing.join(", ")}`}
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 border-amber-100"
                        >
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Missing {lot.missing.length}
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 border-emerald-100"
                        >
                            Ready
                        </Badge>
                    );
                }

                return (
                    <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[lot.status] ?? ""}`}
                    >
                        {lot.status.charAt(0) + lot.status.slice(1).toLowerCase()}
                    </Badge>
                );
            },
        },

        // ACTIONS
        {
            id: "actions",
            header: "Actions",
            enableSorting: false,
            enableGlobalFilter: false,
            cell: ({ row }) => {
                const lot = row.original;

                return (
                    <div className="flex items-center gap-1">
                        {onEdit && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Edit lot"
                                onClick={() => onEdit(lot.index)}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {onView && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Review lot"
                                onClick={() => onView(lot.index)}
                            >
                                <Eye className="h-3.5 w-3.5" />
                            </Button>
                        )}

                        {onDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                title="Remove lot"
                                onClick={() => onDelete(lot.index)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];