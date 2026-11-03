"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import { ROLE_LABELS, RoleName } from "@/lib/constants/roles"
import { User } from "@/lib/types/user.types"
import { fetchAllUsers } from "@/services/operations/user.api"

const csvCell = (value: string | number | null | undefined) => {
    let text = value == null ? "" : String(value)
    // stop a spreadsheet reading a name like "=SUM(…)" as a formula
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const formatDate = (iso: string | null | undefined) =>
    iso
        ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
        : ""

const yesNo = (value: boolean) => (value ? "Yes" : "No")

const HEADER = [
    "First name",
    "Last name",
    "Username",
    "Email",
    "Phone",
    "Role",
    "Status",
    "Email verified",
    "Phone verified",
    "KYC status",
    "City",
    "State",
    "Country",
    "Bids",
    "Lots won",
    "Registered on (IST)",
    "Last login (IST)",
]

const toRow = (user: User) => [
    user.profile?.firstName,
    user.profile?.lastName,
    user.username,
    user.email,
    user.phone,
    ROLE_LABELS[user.role?.name as RoleName] ?? user.role?.name,
    user.status,
    yesNo(user.emailVerified),
    yesNo(user.phoneVerified),
    user.kyc?.status ?? "NOT SUBMITTED",
    user.profile?.city,
    user.profile?.state,
    user.profile?.country,
    user._count?.bids ?? 0,
    user._count?.auctionsWon ?? 0,
    formatDate(user.createdAt),
    formatDate(user.lastLoginAt),
]

// downloads every user (not just the loaded page) as a CSV
export default function ExportUsersButton() {
    const token = useAppSelector((state) => state.auth.accessToken)
    const [exporting, setExporting] = useState(false)

    const handleExport = async () => {
        setExporting(true)
        try {
            const users = await fetchAllUsers(token)
            const csv = [HEADER, ...users.map(toRow)].map((row) => row.map(csvCell).join(",")).join("\r\n")

            // BOM so Excel reads names in UTF-8
            const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
            const link = document.createElement("a")
            link.href = url
            link.download = `akara-users-${new Date().toISOString().slice(0, 10)}.csv`
            link.click()
            URL.revokeObjectURL(url)

            toast.success(`Exported ${users.length} user${users.length === 1 ? "" : "s"}`)
        } catch (error) {
            toast.error(getErrorMessage(error, "Could not export users. Try again."))
        } finally {
            setExporting(false)
        }
    }

    return (
        <Button
            type="button"
            variant="outline"
            className="h-10 gap-1.5 bg-white"
            onClick={handleExport}
            disabled={exporting}
        >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Exporting..." : "Export CSV"}
        </Button>
    )
}
