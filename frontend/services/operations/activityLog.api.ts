import { apiConnector } from "../apiConnector"
import { adminEndPoints } from "../api"
import type { ActivityLogFilters, ActivityLogPage, ActivityLogSummary } from "@/lib/types/activityLog.types"

const { ACTIVITY_LOGS_API, ACTIVITY_LOG_SUMMARY_API, ACTIVITY_LOGS_EXPORT_API } = adminEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

// drop empty filters so the URL stays readable
const toParams = (filters: ActivityLogFilters) =>
    Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "" && value !== "all"))

export async function getActivityLogs(
    token: string | null,
    filters: ActivityLogFilters & { page: number; limit: number }
): Promise<ActivityLogPage> {
    const response = await apiConnector({
        method: "GET",
        url: ACTIVITY_LOGS_API,
        params: toParams(filters),
        header: authHeader(token),
    })
    return response.data.data
}

export async function getActivityLogSummary(token: string | null): Promise<ActivityLogSummary> {
    const response = await apiConnector({ method: "GET", url: ACTIVITY_LOG_SUMMARY_API, header: authHeader(token) })
    return response.data.data
}

// CSV of the filtered logs (newest 10,000), saved by the browser
export async function downloadActivityLogs(token: string | null, filters: ActivityLogFilters): Promise<void> {
    const response = await apiConnector<Blob>({
        method: "GET",
        url: ACTIVITY_LOGS_EXPORT_API,
        params: toParams(filters),
        header: authHeader(token),
        responseType: "blob",
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement("a")
    link.href = url
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
}
