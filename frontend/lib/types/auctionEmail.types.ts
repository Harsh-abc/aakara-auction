// shapes returned by /api/admin/auction-emails (backend/src/services/auctionBroadcast.services.js)
import type { AuctionStatus } from "@/lib/types/auction.types"

export type AuctionEmailAuction = {
    uuid: string
    title: string
    status: AuctionStatus
    startTime: string
    endTime: string
    imageUrl: string | null
    /** registered bidders that can be emailed (banned registrations left out) */
    registeredCount: number
    approvedCount: number
}

export type RecipientStatus = "APPROVED" | "PENDING" | "REJECTED"

export type AuctionEmailRecipient = {
    uuid: string
    username: string
    email: string
    phone: string | null
    emailVerified: boolean
    name: string | null
    avatarUrl: string | null
    paddleNumber: string
    status: RecipientStatus
    registeredAt: string
}

export type AuctionEmailRecipientList = {
    auction: Pick<AuctionEmailAuction, "uuid" | "title" | "status" | "startTime">
    recipients: AuctionEmailRecipient[]
}

export type AuctionEmailDraft = {
    subject: string
    heading: string
    message: string
}

export type AuctionEmailSendResult = {
    message: string
    sent: number
    failed: { uuid: string; email: string | null; name: string; reason: string }[]
}
