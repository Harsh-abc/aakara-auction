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

const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    BANNED: "Banned",
}

const SOURCE_LABELS: Record<string, string> = {
    SELF_REGISTERED: "Self registered",
    ADDED_BY_ADMIN: "Added by admin",
}

// extra columns when exporting one auction's registered bidders
const AUCTION_HEADER = ["Auction", "Paddle no.", "Registration status", "Registered via", "Registered for auction on (IST)"]

const toAuctionCells = (user: User, auctionTitle: string) => {
    const p = user.auctionParticipation
    return [
        auctionTitle,
        p?.paddleNumber,
        p ? PARTICIPANT_STATUS_LABELS[p.status] ?? p.status : "",
        p ? SOURCE_LABELS[p.source] ?? p.source : "",
        formatDate(p?.registeredAt),
    ]
}

// extra columns when exporting bidders: phone bidder flag, paddles and proxy bids
const BIDDER_HEADER = ["Phone bidder", "Paddle no(s).", "Proxy bids", "Proxy bids placed on (lot · maximum)"]

const proxyMoney = (amount: string, currency: string | null) => {
    const n = Number(amount)
    const figure = Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : amount
    return currency ? `${currency} ${figure}` : figure
}

const toBidderCells = (user: User, auctionFiltered: boolean) => {
    const proxies = user.proxyBids ?? []
    // with an auction picked the auction is its own column; otherwise say which auction each lot is in
    const lots = proxies
        .map((p) =>
            `${auctionFiltered ? "" : `${p.auctionTitle} – `}Lot ${p.itemNumber}: ${proxyMoney(p.maxAmount, p.currency)}`
        )
        .join("; ")
    const paddles = auctionFiltered
        ? user.auctionParticipation?.paddleNumber
        : (user.registrations ?? []).map((r) => `#${r.paddleNumber} (${r.auction.title})`).join("; ")
    return [yesNo(!!user.phoneBidderAt), paddles, proxies.length, lots]
}

// "Modern Masters: Nov 2026" -> "modern-masters-nov-2026"
const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)

type ExportUsersButtonProps = {
    // only export users with this role (e.g. "BIDDER"); omit for everyone
    role?: RoleName
    // file name prefix and toast noun, e.g. "bidders"
    label?: string
    // only export users registered for this auction (adds paddle no. / registration columns)
    auction?: { uuid: string; title: string } | null
}

// downloads every user (not just the loaded page) as a CSV
export default function ExportUsersButton({ role, label = "users", auction }: ExportUsersButtonProps) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const [exporting, setExporting] = useState(false)

    const handleExport = async () => {
        setExporting(true)
        try {
            const bidders = role === "BIDDER"
            const fetched = await fetchAllUsers(token, role, auction?.uuid, bidders)
            // guard in case the API ignores the role filter
            const users = role ? fetched.filter((u) => u.role?.name === role) : fetched
            const header = [
                ...(auction ? AUCTION_HEADER : []),
                ...HEADER,
                ...(bidders ? BIDDER_HEADER : []),
            ]
            const rows = users.map((u) => [
                ...(auction ? toAuctionCells(u, auction.title) : []),
                ...toRow(u),
                ...(bidders ? toBidderCells(u, !!auction) : []),
            ])
            const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")

            // BOM so Excel reads names in UTF-8
            const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
            const link = document.createElement("a")
            link.href = url
            const auctionPart = auction ? `-${slugify(auction.title) || "auction"}` : ""
            link.download = `akara-${label}${auctionPart}-${new Date().toISOString().slice(0, 10)}.csv`
            link.click()
            URL.revokeObjectURL(url)

            toast.success(`Exported ${users.length} ${users.length === 1 ? label.replace(/s$/, "") : label}`)
        } catch (error) {
            toast.error(getErrorMessage(error, `Could not export ${label}. Try again.`))
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
