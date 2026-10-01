"use client"

import { ColumnDef } from "@tanstack/react-table"

import { User } from "@/lib/types/user.types"
import ChangeRoleCell from "./ChangeRoleCell"

const getFullName = (user: User) => {
    const fullName = `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim()
    return fullName || user.username
}

export const teamColumns: ColumnDef<User>[] = [
    {
        id: "fullName",
        accessorFn: (user) => getFullName(user),
        header: "Full Name",
        cell: ({ row }) => (
            <span className="font-medium">{getFullName(row.original)}</span>
        ),
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.original.email}</span>
        ),
    },
    {
        accessorKey: "phone",
        header: "Contact no.",
        cell: ({ row }) => <span>{row.original.phone ?? "-"}</span>,
    },
    {
        accessorKey: "lastLoginAt",
        header: "Last login",
        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {row.original.lastLoginAt
                    ? new Date(row.original.lastLoginAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    })
                    : "Never"}
            </span>
        ),
    },
    {
        id: "role",
        accessorFn: (user) => user.role.name,
        header: "Role",
        cell: ({ row }) => (
            <ChangeRoleCell
                uuid={row.original.uuid}
                name={getFullName(row.original)}
                currentRole={row.original.role.name}
            />
        ),
    },
]
