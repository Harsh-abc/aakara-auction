"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
    Pencil,
    Eye,
    Trash2,
} from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { AuctionLotsList } from "@/lib/data"

type ColumnsProps = {
    onEdit?: (id: string) => void
    onView?: (id: string) => void
    onDelete?: (id: string) => void
}

export const getColumns = ({
    onEdit,
    onView,
    onDelete,
}: ColumnsProps = {}): ColumnDef<AuctionLotsList>[] => [
        {
            id: "select",

            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Select all"
                />
            ),

            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) =>
                        row.toggleSelected(!!value)
                    }
                    aria-label="Select row"
                />
            ),

            enableSorting: false,
            enableHiding: false,
        },

        // LOT IMAGE + ARTWORK NAME
        {
            accessorKey: "artworkName",

            header: "Artwork",

            cell: ({ row }) => {
                const lot = row.original

                return (
                    <div className="flex items-center gap-3 min-w-[220px]">

                        <img
                            src={lot.lotImage}
                            alt={lot.artworkName}
                            className="h-9 w-9 rounded-md object-cover border"
                        />

                        <div className="flex flex-col">

                            <span
                                className="truncate font-medium text-[13px]"
                                title={lot.artworkName}
                            >
                                {lot.artworkName}
                            </span>

                            <span className="text-[11px] text-muted-foreground">
                                Lot #{lot.artworkId}
                            </span>

                        </div>

                    </div>
                )
            },
        },

        // ARTIST
        {
            accessorKey: "artist",

            header: "Artist",

            cell: ({ row }) => (
                <span className="text-[12px] whitespace-nowrap">
                    {row.getValue("artist")}
                </span>
            ),
        },

        // ARTWORK ID
        {
            accessorKey: "artworkId",

            header: "Artwork ID",

            cell: ({ row }) => (
                <span className="text-[12px]">
                    {row.getValue("artworkId")}
                </span>
            ),
        },

        // CATEGORY
        {
            accessorKey: "category",

            header: "Category",

            cell: ({ row }) => (
                <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                    {row.getValue("category")}
                </span>
            ),
        },

        // STARTING BID
        {
            accessorKey: "startingBid",

            header: "Starting Bid",

            cell: ({ row }) => (
                <span className="text-[12px] font-medium whitespace-nowrap">
                    {row.getValue("startingBid")}
                </span>
            ),
        },

        // RESERVE BID
        {
            accessorKey: "reserveBid",

            header: "Reserve Price",

            cell: ({ row }) => (
                <span className="text-[12px] font-medium whitespace-nowrap">
                    {row.getValue("reserveBid")}
                </span>
            ),
        },

        // STATUS
        {
            accessorKey: "status",

            header: "Status",

            cell: ({ row }) => {
                const status =
                    row.getValue("status") as AuctionLotsList["status"]

                return (
                    <Badge
                        variant="outline"
                        className="
                        rounded-full
                        px-2.5
                        py-0.5
                        text-[10px]
                        font-medium
                        bg-amber-50
                        text-amber-600
                        border-amber-100
                    "
                    >
                        {status}
                    </Badge>
                )
            },
        },

        // ACTIONS
        {
            id: "actions",

            header: "Actions",

            cell: ({ row }) => {
                const lot = row.original

                return (
                    <div className="flex items-center gap-1">

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit?.(lot.id)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onView?.(lot.id)}
                        >
                            <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => onDelete?.(lot.id)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>

                    </div>
                )
            },

            enableSorting: false,
        },
    ]