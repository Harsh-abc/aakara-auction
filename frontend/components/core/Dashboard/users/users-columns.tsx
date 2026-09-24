"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { User } from "@/lib/types/user.types"

// Works out the badge text from user status + kyc
const getAccountStatus = (user: User) => {
    if (user.status === "ACTIVE") return "Active"
    if (user.status === "SUSPENDED") return "Suspended"
    if (user.status === "PENDING_VERIFICATION") return "Pending Verification"
    return user.status
}

const getKycStatus = (user: User) => {
    if (!user.kyc) return "Not Uploaded"
    return user.kyc.status   // shows exactly what's in the DB
}

const getFullName = (user: User) => {
    const userName = user.username
    const firstName = user.profile?.firstName ?? ""
    const lastName = user.profile?.lastName ?? ""
    const fullName = `${firstName} ${lastName}`.trim()

    return fullName || userName
}

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
        id: "fullName",
        accessorFn: (user) => getFullName(user),

        header: "Full Name",

        cell: ({ row }) => (
            <span className="font-medium">
                {getFullName(row.original)}
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
        accessorKey: "phone",

        header: "Contact no.",

        cell: ({ row }) => (
            <span>
                {row.original.phone ?? "-"}
            </span>
        ),
    },

    {
        accessorKey: "createdAt",

        header: "Created on",

        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {new Date(row.original.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                })}
            </span>
        ),
    },

    {
        id: "status",
        accessorFn: (user) => getAccountStatus(user),

        header: "Status",

        cell: ({ row }) => {
            const status = getAccountStatus(row.original)

            const statusClass: Record<string, string> = {
                Active: "bg-green-50 text-green-600 border-green-100",
                Suspended: "bg-red-50 text-red-500 border-red-100",
                "Pending Verification": "bg-orange-50 text-orange-500 border-orange-100",
            }

            return (
                <Badge
                    variant="outline"
                    className={`rounded-full px-3 py-1 text-xs font-normal ${statusClass[status] ?? ""}`}
                >
                    {status}
                </Badge>
            )
        },
    },

    {
        id: "kyc",
        accessorFn: (user) => getKycStatus(user),

        header: "KYC",

        cell: ({ row }) => {
            const kyc = getKycStatus(row.original)

            const kycClass: Record<string, string> = {
                VERIFIED: "bg-green-50 text-green-600 border-green-100",
                PENDING: "bg-orange-50 text-orange-500 border-orange-100",
                REJECTED: "bg-red-50 text-red-500 border-red-100",
                "Not Uploaded": "bg-gray-100 text-gray-600 border-gray-200",
            }

            return (
                <Badge
                    variant="outline"
                    className={`rounded-full px-3 py-1 text-xs font-normal ${kycClass[kyc] ?? ""}`}
                >
                    {kyc}
                </Badge>
            )
        },
    },

    {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => {
            const userId = row.original.uuid

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