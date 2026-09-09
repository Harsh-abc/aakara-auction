"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { User } from "@/lib/data"

export const columns: ColumnDef<User>[] = [
    {
        id: "select",

        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    table.getIsSomePageRowsSelected()
                }
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

    {
        accessorKey: "fullName",

        header: "Full Name",

        cell: ({ row }) => (
            <span className="font-medium">
                {row.original.fullName}
            </span>
        ),
    },

    {
        accessorKey: "email",

        header: "Email",

        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
                {row.original.email}
            </span>
        ),
    },

    {
        accessorKey: "contactNo",

        header: "Contact no.",

        cell: ({ row }) => (
            <span>
                {row.original.contactNo}
            </span>
        ),
    },

    {
        accessorKey: "createdOn",

        header: "Created on",

        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {row.original.createdOn}
            </span>
        ),
    },

    {
        accessorKey: "status",

        header: "Status",

        cell: ({ row }) => {
            const status = row.original.status

            const statusClass = {
                Verified:
                    "bg-green-50 text-green-600 border-green-100",

                Suspended:
                    "bg-red-50 text-red-500 border-red-100",

                "Pending Verification":
                    "bg-orange-50 text-orange-500 border-orange-100",

                "KYC Not Uploaded":
                    "bg-gray-100 text-gray-600 border-gray-200",
            }[status]

            return (
                <Badge
                    variant="outline"
                    className={`rounded-full px-3 py-1 text-xs font-normal ${statusClass}`}
                >
                    {status}
                </Badge>
            )
        },
    },

    {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => {
            const userId = row.original.id

            return (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                >
                    <Link href={`/dashboard/users/${userId}`}>
                        <Eye className="h-4 w-4" />
                    </Link>
                </Button>
            )
        },
    },
]