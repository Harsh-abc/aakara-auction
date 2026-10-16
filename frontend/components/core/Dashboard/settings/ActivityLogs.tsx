"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import {
    Activity,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Globe,
    Loader2,
    LogIn,
    RefreshCw,
    Search,
    ShieldAlert,
    Users,
    X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector } from "@/hooks/redux"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getErrorMessage } from "@/lib/apiError"
import { ROLE_LABELS, type RoleName } from "@/lib/constants/roles"
import type {
    ActivityLog,
    ActivityLogFilters,
    ActivityLogPage,
    ActivityLogSummary,
    ActivityStatusFilter,
} from "@/lib/types/activityLog.types"
import { cn } from "@/lib/utils"
import { downloadActivityLogs, getActivityLogs, getActivityLogSummary } from "@/services/operations/activityLog.api"

import { DASHBOARD_TIME_ZONE, PanelMessage, type PillTone, StatusPill } from "../home/dashboardUi"

const PAGE_SIZES = [25, 50, 100]
const ALL = "ALL"

// matches the modules written by backend/src/middleware/activityLogger.js
const MODULES: Record<string, { label: string; tone: PillTone }> = {
    AUTH: { label: "Sign-in", tone: "maroon" },
    USER: { label: "Users & team", tone: "amber" },
    KYC: { label: "KYC", tone: "amber" },
    PROFILE: { label: "Own profile", tone: "slate" },
    AUCTION: { label: "Auctions", tone: "green" },
    LOT: { label: "Lots", tone: "green" },
    REGISTRATION: { label: "Registrations", tone: "green" },
    BIDDING: { label: "Bidding", tone: "maroon" },
    LIVE: { label: "Live stream", tone: "red" },
    BROWSE: { label: "Storefront", tone: "slate" },
    GALLERY: { label: "Gallery", tone: "slate" },
    UPLOAD: { label: "Uploads", tone: "slate" },
    AUDIT: { label: "Activity logs", tone: "red" },
    SYSTEM: { label: "System", tone: "slate" },
    API: { label: "Other", tone: "slate" },
}

const moduleInfo = (module: string) => MODULES[module] ?? { label: module, tone: "slate" as PillTone }

const STATUS_OPTIONS: { value: ActivityStatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
]

// ---------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------

const timeFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: DASHBOARD_TIME_ZONE,
})

const formatTime = (iso: string) => timeFmt.format(new Date(iso))

const timeAgo = (iso: string) => {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
    if (seconds < 60) return "just now"
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.round(hours / 24)}d ago`
}

const roleLabel = (role: string | null) =>
    role === "SYSTEM" ? "System" : role ? (ROLE_LABELS[role as RoleName] ?? role) : null

/** "Chrome on Windows" — enough to tell devices apart at a glance */
const describeDevice = (ua: string | null) => {
    if (!ua) return null
    const browser = /Edg\//.test(ua)
        ? "Edge"
        : /OPR\//.test(ua)
          ? "Opera"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Firefox\//.test(ua)
              ? "Firefox"
              : /Safari\//.test(ua)
                ? "Safari"
                : /PostmanRuntime/.test(ua)
                  ? "Postman"
                  : /curl\//.test(ua)
                    ? "curl"
                    : null
    const os = /Windows/.test(ua)
        ? "Windows"
        : /Android/.test(ua)
          ? "Android"
          : /iPhone|iPad/.test(ua)
            ? "iOS"
            : /Mac OS X/.test(ua)
              ? "macOS"
              : /Linux/.test(ua)
                ? "Linux"
                : null
    return [browser, os].filter(Boolean).join(" on ") || "Other client"
}

// <input type="date"> gives a local day — send the instants it starts and ends
const dayStart = (day: string) => (day ? new Date(`${day}T00:00:00`).toISOString() : undefined)
const dayEnd = (day: string) => (day ? new Date(`${day}T23:59:59.999`).toISOString() : undefined)

const count = (n: number) => n.toLocaleString("en-IN")

// ---------------------------------------------------------------------
// small pieces
// ---------------------------------------------------------------------

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | null; tone?: "red" }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span
                className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    tone === "red" ? "bg-[#FDECEC] text-[#C93B3B]" : "bg-[#F6E9EF] text-[#7B2D52]"
                )}
            >
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-[11px] text-[#62666F]">{label}</p>
                <p className="text-[18px] font-bold leading-tight text-slate-900">{value === null ? "—" : count(value)}</p>
            </div>
        </div>
    )
}

function Segmented<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T
    options: { value: T; label: string }[]
    onChange: (value: T) => void
}) {
    return (
        <div className="flex h-10 items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "h-full cursor-pointer rounded-md px-3 text-[12px] font-semibold transition-colors",
                        value === option.value ? "bg-[#7B2D52] text-white" : "text-slate-500 hover:text-slate-800"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

function ActorCell({ log }: { log: ActivityLog }) {
    const { actor } = log
    if (actor.role === "SYSTEM") {
        return <p className="font-semibold text-slate-900">System</p>
    }
    if (!actor.name && !actor.email) {
        return <p className="text-[#8A8D94]">Guest</p>
    }
    const role = roleLabel(actor.role)
    return (
        <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
                {actor.uuid ? (
                    <Link href={`/dashboard/users/${actor.uuid}`} className="hover:text-[#7B2D52] hover:underline">
                        {actor.name ?? actor.email}
                    </Link>
                ) : (
                    (actor.name ?? actor.email)
                )}
            </p>
            <p className="truncate text-[11px] text-[#8A8D94]">
                {[actor.name ? actor.email : null, role].filter(Boolean).join(" · ") || "No account"}
            </p>
        </div>
    )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 py-1 text-[12px]">
            <span className="text-[#8A8D94]">{label}</span>
            <span className="min-w-0 wrap-break-word text-slate-800">{children}</span>
        </div>
    )
}

function LogDetails({
    log,
    onFilterUser,
    onFilterIp,
}: {
    log: ActivityLog
    onFilterUser: (log: ActivityLog) => void
    onFilterIp: (ip: string) => void
}) {
    const { request, result, files, referer, ...rest } = (log.metadata ?? {}) as Record<string, unknown>
    const extra = Object.keys(rest).length ? rest : null

    return (
        <div className="grid grid-cols-1 gap-4 bg-[#FAFAFB] px-4 py-4 lg:grid-cols-2">
            <div>
                <DetailRow label="Action code">
                    <code className="text-[11px]">{log.action}</code>
                </DetailRow>
                {typeof result === "string" && <DetailRow label="Server reply">{result}</DetailRow>}
                {log.path && (
                    <DetailRow label="Request">
                        <code className="text-[11px]">
                            {log.method} {log.path}
                        </code>
                    </DetailRow>
                )}
                {log.statusCode !== null && (
                    <DetailRow label="HTTP status">
                        {log.statusCode}
                        {log.durationMs !== null && <span className="text-[#8A8D94]"> · {count(log.durationMs)} ms</span>}
                    </DetailRow>
                )}
                {log.target && (
                    <DetailRow label="Target">
                        {log.target.label ?? "—"}
                        <span className="block text-[11px] text-[#8A8D94]">
                            {log.target.type} · {log.target.id}
                        </span>
                    </DetailRow>
                )}
                <DetailRow label="IP address">{log.ipAddress ?? "—"}</DetailRow>
                <DetailRow label="Device">
                    {describeDevice(log.userAgent) ?? "—"}
                    {log.userAgent && <span className="block text-[11px] text-[#8A8D94]">{log.userAgent}</span>}
                </DetailRow>
                {typeof referer === "string" && <DetailRow label="From page">{referer}</DetailRow>}
                <DetailRow label="Logged at">
                    {formatTime(log.createdAt)} <span className="text-[#8A8D94]">({log.createdAt})</span>
                </DetailRow>

                <div className="mt-3 flex flex-wrap gap-2">
                    {(log.actor.uuid || log.actor.email) && (
                        <Button type="button" variant="outline" className="h-8 bg-white text-[11px]" onClick={() => onFilterUser(log)}>
                            All activity by this user
                        </Button>
                    )}
                    {log.ipAddress && (
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 bg-white text-[11px]"
                            onClick={() => onFilterIp(log.ipAddress as string)}
                        >
                            All activity from this IP
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
                {request !== undefined && <JsonBlock title="Submitted data" value={request} />}
                {files !== undefined && <JsonBlock title="Files" value={files} />}
                {extra && <JsonBlock title="Other details" value={extra} />}
                {request === undefined && files === undefined && !extra && (
                    <p className="text-[12px] text-[#8A8D94]">No submitted data for this entry.</p>
                )}
            </div>
        </div>
    )
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
    return (
        <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold text-[#62666F]">{title}</p>
            <pre className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-700">
                {JSON.stringify(value, null, 2)}
            </pre>
        </div>
    )
}

// =====================================================================
// PAGE
// =====================================================================

export function ActivityLogs() {
    const token = useAppSelector((state) => state.auth.accessToken)
    const isSuperAdmin = useAppSelector((state) => state.auth.role) === "SUPER_ADMIN"

    const [searchInput, setSearchInput] = useState("")
    const search = useDebouncedValue(searchInput.trim())
    const [ipInput, setIpInput] = useState("")
    const ip = useDebouncedValue(ipInput.trim())
    const [module, setModule] = useState(ALL)
    const [action, setAction] = useState(ALL)
    const [status, setStatus] = useState<ActivityStatusFilter>("all")
    const [fromDay, setFromDay] = useState("")
    const [toDay, setToDay] = useState("")
    // set from a row's "All activity by this user"
    const [user, setUser] = useState<{ uuid: string | null; label: string } | null>(null)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(PAGE_SIZES[0])
    const [refresh, setRefresh] = useState(0)
    const [open, setOpen] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    const filters: ActivityLogFilters = useMemo(
        () => ({
            // a user without an account (failed sign-in) is found by their email
            search: user && !user.uuid ? user.label : search || undefined,
            userUuid: user?.uuid ?? undefined,
            module: module === ALL ? undefined : module,
            action: action === ALL ? undefined : action,
            status,
            ip: ip || undefined,
            from: dayStart(fromDay),
            to: dayEnd(toDay),
        }),
        [search, user, module, action, status, ip, fromDay, toDay]
    )

    const listKey = JSON.stringify({ filters, page, limit, refresh })
    const [list, setList] = useState<{ key: string; data: ActivityLogPage | null; error: string | null } | null>(null)
    const [summary, setSummary] = useState<ActivityLogSummary | null>(null)

    useEffect(() => {
        if (!token || !isSuperAdmin) return
        let cancelled = false
        getActivityLogs(token, { ...filters, page, limit })
            .then((data) => {
                if (!cancelled) setList({ key: listKey, data, error: null })
            })
            .catch((err) => {
                // keep the last good page on screen
                if (!cancelled) setList((prev) => ({ key: listKey, data: prev?.data ?? null, error: getErrorMessage(err) }))
            })
        return () => {
            cancelled = true
        }
    }, [token, isSuperAdmin, filters, page, limit, listKey])

    useEffect(() => {
        if (!token || !isSuperAdmin) return
        let cancelled = false
        getActivityLogSummary(token)
            .then((data) => {
                if (!cancelled) setSummary(data)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [token, isSuperAdmin, refresh])

    if (!isSuperAdmin) {
        return (
            <PanelMessage>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Only super admins can view the activity logs.
            </PanelMessage>
        )
    }

    const loading = list?.key !== listKey
    const logs = list?.data?.logs ?? null
    const pagination = list?.data?.pagination
    const stats = summary?.last24h ?? null
    const actionOptions = (summary?.actions ?? []).filter((a) => module === ALL || a.module === module)
    const hasFilters =
        !!searchInput || !!ipInput || module !== ALL || action !== ALL || status !== "all" || !!fromDay || !!toDay || !!user

    // any filter change starts again at page 1
    const change = (apply: () => void) => {
        apply()
        setPage(1)
        setOpen(null)
    }

    const clearFilters = () =>
        change(() => {
            setSearchInput("")
            setIpInput("")
            setModule(ALL)
            setAction(ALL)
            setStatus("all")
            setFromDay("")
            setToDay("")
            setUser(null)
        })

    const filterByUser = (log: ActivityLog) =>
        change(() => {
            setSearchInput("")
            setUser({ uuid: log.actor.uuid, label: log.actor.uuid ? (log.actor.name ?? log.actor.email ?? "User") : (log.actor.email ?? "") })
        })

    const filterByIp = (address: string) => change(() => setIpInput(address))

    const exportCsv = async () => {
        setExporting(true)
        try {
            await downloadActivityLogs(token, filters)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="flex flex-col gap-5">
            {/* last 24 hours */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <StatTile icon={<Activity className="h-4 w-4" />} label="Events · last 24h" value={stats?.events ?? null} />
                <StatTile icon={<ShieldAlert className="h-4 w-4" />} label="Failed / refused" value={stats?.failed ?? null} tone="red" />
                <StatTile icon={<LogIn className="h-4 w-4" />} label="Failed sign-ins" value={stats?.failedLogins ?? null} tone="red" />
                <StatTile icon={<Users className="h-4 w-4" />} label="Active users" value={stats?.activeUsers ?? null} />
                <StatTile icon={<Globe className="h-4 w-4" />} label="Unique IP addresses" value={stats?.uniqueIps ?? null} />
            </div>

            <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                {/* filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchInput}
                            onChange={(e) =>
                                change(() => {
                                    setSearchInput(e.target.value)
                                    setUser(null)
                                })
                            }
                            placeholder="Search user, action, lot, IP…"
                            className="h-10 bg-white pl-9 text-[13px]"
                        />
                    </div>

                    <Select
                        value={module}
                        onValueChange={(value) =>
                            value !== null &&
                            change(() => {
                                setModule(value)
                                setAction(ALL)
                            })
                        }
                    >
                        <SelectTrigger className="h-10 w-40 bg-white text-[13px]" aria-label="Filter by area">
                            <SelectValue>{module === ALL ? "All areas" : moduleInfo(module).label}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectGroup>
                                <SelectItem value={ALL}>All areas</SelectItem>
                                {(summary?.modules ?? []).map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {moduleInfo(m).label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    <Select value={action} onValueChange={(value) => value !== null && change(() => setAction(value))}>
                        <SelectTrigger className="h-10 w-56 bg-white text-[13px]" aria-label="Filter by action">
                            <SelectValue>
                                {action === ALL ? "All actions" : (summary?.actions.find((a) => a.action === action)?.label ?? action)}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-80 bg-white">
                            <SelectGroup>
                                <SelectItem value={ALL}>All actions</SelectItem>
                                {actionOptions.map((a) => (
                                    <SelectItem key={a.action} value={a.action}>
                                        {a.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    <Segmented value={status} options={STATUS_OPTIONS} onChange={(value) => change(() => setStatus(value))} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                        value={ipInput}
                        onChange={(e) => change(() => setIpInput(e.target.value))}
                        placeholder="IP address"
                        className="h-10 w-full bg-white text-[13px] sm:w-44"
                    />
                    <label className="flex items-center gap-2 text-[12px] text-[#62666F]">
                        From
                        <Input
                            type="date"
                            value={fromDay}
                            max={toDay || undefined}
                            onChange={(e) => change(() => setFromDay(e.target.value))}
                            className="h-10 w-40 bg-white text-[13px]"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-[#62666F]">
                        To
                        <Input
                            type="date"
                            value={toDay}
                            min={fromDay || undefined}
                            onChange={(e) => change(() => setToDay(e.target.value))}
                            className="h-10 w-40 bg-white text-[13px]"
                        />
                    </label>
                    {hasFilters && (
                        <Button type="button" variant="ghost" className="h-10 gap-1 text-[12px] text-[#7B2D52]" onClick={clearFilters}>
                            <X className="h-3.5 w-3.5" />
                            Clear filters
                        </Button>
                    )}

                    <div className="ml-auto flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 gap-1.5 bg-white text-[12px]"
                            onClick={() => setRefresh((n) => n + 1)}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", loading && logs && "animate-spin")} />
                            Refresh
                        </Button>
                        <Button
                            type="button"
                            className="h-10 gap-1.5 bg-[#7B2D52] text-[12px] text-white hover:bg-[#62223F]"
                            onClick={exportCsv}
                            disabled={exporting}
                        >
                            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            Export CSV
                        </Button>
                    </div>
                </div>

                {user && (
                    <div className="mt-3 flex items-center gap-2 text-[12px] text-[#62666F]">
                        Showing activity by
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F6E9EF] px-2 py-0.5 font-semibold text-[#7B2D52]">
                            {user.label}
                            <button type="button" aria-label="Show everyone" onClick={() => change(() => setUser(null))} className="cursor-pointer">
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    </div>
                )}

                {/* table */}
                <div className="mt-4">
                    {!logs ? (
                        list?.error ? (
                            <PanelMessage>{list.error}</PanelMessage>
                        ) : (
                            <PanelMessage>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading activity…
                            </PanelMessage>
                        )
                    ) : logs.length === 0 ? (
                        <PanelMessage>{hasFilters ? "No activity matches these filters." : "No activity recorded yet."}</PanelMessage>
                    ) : (
                        <div className={cn("overflow-x-auto rounded-lg border border-slate-200 bg-white", loading && "opacity-60")}>
                            <table className="w-full min-w-240 text-left text-[12px]">
                                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-[#62666F]">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold">Time</th>
                                        <th className="px-4 py-2.5 font-semibold">User</th>
                                        <th className="px-4 py-2.5 font-semibold">Activity</th>
                                        <th className="px-4 py-2.5 font-semibold">IP address</th>
                                        <th className="px-4 py-2.5 font-semibold">Result</th>
                                        <th className="w-10 px-2 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => {
                                        const isOpen = open === log.id
                                        const area = moduleInfo(log.module)
                                        return (
                                            <Fragment key={log.id}>
                                                <tr
                                                    onClick={() => setOpen(isOpen ? null : log.id)}
                                                    className={cn(
                                                        "cursor-pointer border-b border-slate-100 align-top transition-colors hover:bg-slate-50",
                                                        isOpen && "bg-slate-50"
                                                    )}
                                                >
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <p className="text-slate-900">{formatTime(log.createdAt)}</p>
                                                        <p className="text-[11px] text-[#8A8D94]">{timeAgo(log.createdAt)}</p>
                                                    </td>
                                                    <td className="max-w-55 px-4 py-3">
                                                        <ActorCell log={log} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-start gap-2">
                                                            <StatusPill tone={area.tone}>{area.label}</StatusPill>
                                                            <div className="min-w-0">
                                                                <p className="text-slate-900">{log.description ?? log.action}</p>
                                                                {log.target?.label && (
                                                                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[#8A8D94]">
                                                                        {log.target.label}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <p className="font-mono text-[11px] text-slate-900">{log.ipAddress ?? "—"}</p>
                                                        <p className="text-[11px] text-[#8A8D94]">{describeDevice(log.userAgent) ?? ""}</p>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        {log.success ? (
                                                            <StatusPill tone="green">Success</StatusPill>
                                                        ) : (
                                                            <StatusPill tone="red">Failed{log.statusCode ? ` · ${log.statusCode}` : ""}</StatusPill>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-3 text-slate-400">
                                                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                                                    </td>
                                                </tr>
                                                {isOpen && (
                                                    <tr className="border-b border-slate-100">
                                                        <td colSpan={6} className="p-0">
                                                            <LogDetails log={log} onFilterUser={filterByUser} onFilterIp={filterByIp} />
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* pagination */}
                {pagination && pagination.total > 0 && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#62666F]">
                        <span>
                            {count((pagination.page - 1) * pagination.limit + 1)}–
                            {count(Math.min(pagination.page * pagination.limit, pagination.total))} of {count(pagination.total)} entries
                        </span>
                        <div className="flex items-center gap-2">
                            <Select
                                value={String(limit)}
                                onValueChange={(value) => value !== null && change(() => setLimit(Number(value)))}
                            >
                                <SelectTrigger className="h-8 w-28 bg-white text-[12px]" aria-label="Rows per page">
                                    <SelectValue>{limit} / page</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectGroup>
                                        {PAGE_SIZES.map((size) => (
                                            <SelectItem key={size} value={String(size)}>
                                                {size} / page
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <span>
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-white"
                                disabled={page <= 1 || loading}
                                onClick={() => {
                                    setPage((p) => p - 1)
                                    setOpen(null)
                                }}
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-white"
                                disabled={page >= pagination.totalPages || loading}
                                onClick={() => {
                                    setPage((p) => p + 1)
                                    setOpen(null)
                                }}
                                aria-label="Next page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    )
}
