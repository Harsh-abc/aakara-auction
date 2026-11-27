// shapes returned by /api/admin/live-access (backend/src/services/liveAccess.services.js)

export type LiveAccessAuctionStatus = "DRAFT" | "SCHEDULED" | "PREVIEW" | "LIVE" | "PAUSED"

export type LiveAccessAuction = {
    uuid: string
    title: string
    status: LiveAccessAuctionStatus
    startTime: string
    endTime: string
    imageUrl: string | null
    /** while LIVE / PAUSED only staff and the picked bidders see the sale */
    liveAccessRestricted: boolean
    viewerCount: number
}

export type LiveAccessPerson = {
    uuid: string
    username: string
    email: string
    phone: string | null
    name: string | null
    avatarUrl: string | null
    /** set when they're registered for this auction */
    paddleNumber: number | null
}

export type LiveViewer = LiveAccessPerson & {
    addedAt: string
    addedBy: string | null
}

export type LiveViewerList = {
    auction: Pick<LiveAccessAuction, "uuid" | "title" | "status" | "liveAccessRestricted">
    viewers: LiveViewer[]
}
