// shapes returned by /api/admin/activity-logs (backend/src/services/activityLog.services.js)

export interface ActivityLog {
    id: string
    createdAt: string
    actor: {
        /** links to the user's page; null for guests, the system, or a deleted user */
        uuid: string | null
        name: string | null
        email: string | null
        /** role at the time — SYSTEM for the scheduler */
        role: string | null
    }
    module: string
    action: string
    description: string | null
    method: string | null
    path: string | null
    statusCode: number | null
    success: boolean
    ipAddress: string | null
    userAgent: string | null
    target: { type: string; id: string | null; label: string | null } | null
    metadata: Record<string, unknown> | null
    durationMs: number | null
}

export interface ActivityLogPage {
    logs: ActivityLog[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface ActivityActionOption {
    module: string
    action: string
    label: string
}

export interface ActivityLogSummary {
    last24h: {
        events: number
        failed: number
        failedLogins: number
        activeUsers: number
        uniqueIps: number
    }
    modules: string[]
    actions: ActivityActionOption[]
}

export type ActivityStatusFilter = "all" | "success" | "failed"

export interface ActivityLogFilters {
    search?: string
    module?: string
    action?: string
    status?: ActivityStatusFilter
    userUuid?: string
    ip?: string
    /** ISO instants */
    from?: string
    to?: string
}
