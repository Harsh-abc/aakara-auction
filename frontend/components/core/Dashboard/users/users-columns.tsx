"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { AppTableFeatures } from "@/lib/table-features"
import { BadgeCheck, BadgeX } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { UserActionsCell } from "./UserActionsCell"

import { User } from "@/lib/types/user.types"
import { KYC_DOCUMENTS } from "@/lib/constants/kyc"

// Works out the badge text from user status + kyc
const getAccountStatus = (user: User) => {
    if (user.status === "ACTIVE") return "Active"
    if (user.status === "SUSPENDED") return "Suspended"
    if (user.status === "PENDING_VERIFICATION") return "Pending Verification"
    return user.status
}

const KYC_STATUS_LABEL: Record<string, string> = {
    VERIFIED: "Approved",
    UNDER_REVIEW: "Under Review",
    PENDING: "Pending",
    REJECTED: "Rejected",
    NOT_SUBMITTED: "Not Uploaded",
}

const getKycStatus = (user: User) => {
    if (!user.kyc) return "Not Uploaded"
    return KYC_STATUS_LABEL[user.kyc.status] ?? user.kyc.status
}

// "Aadhaar card, PAN card" — the list sends uploadedDocumentTypes; a row just
// updated from the user page carries the full documents instead
const getKycDocuments = (user: User) => {
    const types =
        user.kyc?.uploadedDocumentTypes ??
        (user.kyc?.documents ?? []).filter((doc) => doc.status !== "REJECTED").map((doc) => doc.documentType)
    return [...new Set(types)].map((type) => KYC_DOCUMENTS[type]?.title ?? type)
}

const getFullName = (user: User) => {
    const userName = user.username
    const firstName = user.profile?.firstName ?? ""
    const lastName = user.profile?.lastName ?? ""
    const fullName = `${firstName} ${lastName}`.trim()

    return fullName || userName
}

// Green tick next to a verified email / phone, red cross next to an unverified one
const VerificationBadge = ({ verified }: { verified: boolean }) =>
    verified ? (
        <BadgeCheck className="h-4 w-4 shrink-0 text-green-600" aria-label="Verified">
            <title>Verified</title>
        </BadgeCheck>
    ) : (
        <BadgeX className="h-4 w-4 shrink-0 text-red-500" aria-label="Not verified">
            <title>Not verified</title>
        </BadgeX>
    )

export const columns: ColumnDef<AppTableFeatures, User>[] = [
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
            <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">
                    {row.original.email}
                </span>
                <VerificationBadge verified={row.original.emailVerified} />
            </div>
        ),
    },

    {
        accessorKey: "phone",

        header: "Contact no.",

        cell: ({ row }) => (
            <div className="flex items-center gap-1.5">
                <span>
                    {row.original.phone ?? "-"}
                </span>
                {/* no number on file: nothing to verify */}
                {row.original.phone && <VerificationBadge verified={row.original.phoneVerified} />}
            </div>
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
            const documents = getKycDocuments(row.original)

            const kycClass: Record<string, string> = {
                Approved: "bg-green-50 text-green-600 border-green-100",
                "Under Review": "bg-blue-50 text-blue-600 border-blue-100",
                Pending: "bg-orange-50 text-orange-500 border-orange-100",
                Rejected: "bg-red-50 text-red-500 border-red-100",
                "Not Uploaded": "bg-gray-100 text-gray-600 border-gray-200",
            }

            return (
                <div className="flex flex-col items-start gap-1">
                    <Badge
                        variant="outline"
                        className={`rounded-full px-3 py-1 text-xs font-normal ${kycClass[kyc] ?? ""}`}
                    >
                        {kyc}
                    </Badge>
                    {documents.length > 0 && (
                        <span
                            className="max-w-56 truncate text-[11px] text-muted-foreground"
                            title={documents.join(", ")}
                        >
                            {documents.join(", ")}
                        </span>
                    )}
                </div>
            )
        },
    },

    {
        id: "actions",

        header: "Actions",

        // view the user; super admins can also suspend / reactivate
        cell: ({ row }) => <UserActionsCell user={row.original} />,
    },
]

// Yes when the user has the BIDDER role (bidder access is granted on the user page)
const bidderColumn: ColumnDef<AppTableFeatures, User> = {
    id: "bidder",
    accessorFn: (user) => (user.role?.name === "BIDDER" ? "Yes" : "No"),

    header: "Bidder",

    cell: ({ row }) => {
        const isBidder = row.original.role?.name === "BIDDER"

        return (
            <Badge
                variant="outline"
                className={`rounded-full px-3 py-1 text-xs font-normal ${
                    isBidder
                        ? "bg-green-50 text-green-600 border-green-100"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
            >
                {isBidder ? "Yes" : "No"}
            </Badge>
        )
    },
}

// Users & Bidders pages: same columns with "Bidder" placed before the account status
export const bidderColumns: ColumnDef<AppTableFeatures, User>[] = columns.flatMap((column) =>
    column.id === "status" ? [bidderColumn, column] : [column]
)