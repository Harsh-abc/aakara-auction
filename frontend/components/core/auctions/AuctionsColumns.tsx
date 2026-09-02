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
import { Auction } from "@/lib/data"



export const columns: ColumnDef<Auction>[] = [
    // Checkbox
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

    // Auction
    {
        accessorKey: "auctionName",

        header: "Auction Name",

        cell: ({ row }) => {
            const auction = row.original

            return (
                <div className="flex items-center gap-3 min-w-[210px]">

                    <img
                        src={auction.image}
                        alt={auction.auctionName}
                        className="h-8 w-8 rounded-md object-cover border"
                    />

                    <span
                        className="truncate font-medium text-[13px]"
                        title={auction.auctionName}
                    >
                        {auction.auctionName}
                    </span>

                </div>
            )
        },
    },

    // Type
    {
        accessorKey: "type",

        header: "Type",

        cell: ({ row }) => (
            <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                {row.getValue("type")}
            </span>
        ),
    },

    // Category
    {
        accessorKey: "category",

        header: "Category",

        cell: ({ row }) => (
            <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                {row.getValue("category")}
            </span>
        ),
    },

    // Artworks
    {
        accessorKey: "artworks",

        header: "Artworks",

        cell: ({ row }) => (
            <span className="text-[12px] font-medium">
                {row.getValue("artworks")}
            </span>
        ),
    },

    // Start Date
    {
        accessorKey: "startDate",

        header: "Start Date",

        cell: ({ row }) => (
            <span className="text-[12px] whitespace-nowrap">
                {row.getValue("startDate")}
            </span>
        ),
    },

    // End Date
    {
        accessorKey: "endDate",

        header: "End Date",

        cell: ({ row }) => (
            <span className="text-[12px] whitespace-nowrap">
                {row.getValue("endDate")}
            </span>
        ),
    },

    // Status
    {
        accessorKey: "status",

        header: "Status",

        cell: ({ row }) => {
            const status = row.getValue("status") as Auction["status"]

            const statusStyles = {
                Live: "bg-emerald-50 text-emerald-600 border-emerald-100",
                Scheduled: "bg-blue-50 text-blue-600 border-blue-100",
                Draft: "bg-slate-100 text-slate-600 border-slate-200",
                Completed: "bg-gray-100 text-gray-600 border-gray-200",
            }

            return (
                <Badge
                    variant="outline"
                    className={`
            rounded-full
            px-2.5
            py-0.5
            text-[10px]
            font-medium
            ${statusStyles[status]}
          `}
                >
                    {status}
                </Badge>
            )
        },
    },

    // Actions
    {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => {
            const auction = row.original

            return (
                <div className="flex items-center gap-1">

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                            console.log("Edit", auction.id)
                        }}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                            console.log("View", auction.id)
                        }}
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => {
                            console.log("Delete", auction.id)
                        }}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                </div>
            )
        },

        enableSorting: false,
    },
]