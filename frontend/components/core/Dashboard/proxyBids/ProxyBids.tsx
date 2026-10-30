"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import {
    Bot,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Globe,
    Loader2,
    Radio,
    RefreshCw,
    Search,
    ShieldAlert,
    Trophy,
    UserX,
    Users,
    X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector } from "@/hooks/redux"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { ProxyBidFilters, ProxyBidPage, ProxyBidRow, ProxyBidSummary, ProxyStage } from "@/lib/types/proxyBid.types"
import { cn } from "@/lib/utils"
import { downloadProxyBids, getProxyBids, getProxyBidSummary } from "@/services/operations/proxyBid.api"

import { DASHBOARD_TIME_ZONE, describeDevice, money, PanelMessage, type PillTone, Segmented, StatTile, StatusPill } from "../home/dashboardUi"
import { PROXY_OUTCOMES } from "./proxyDisplay"
import { ProxySwitches } from "./ProxySwitches"

const PAGE_SIZES = [25, 50, 100]
const ALL = "ALL"
// mirror PROXY_AUDIT_ROLES / PROXY_SWITCH_ROLES in backend/src/routes/bidding.routes.js
const PROXY_AUDIT_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER"]
const PROXY_SWITCH_ROLES = ["SUPER_ADMIN", "ADMIN", "OPERATIONS"]

const STAGE_OPTIONS: { value: ProxyStage; label: string }[] = [
    { value: "all", label: "All" },
    { value: "waiting", label: "Waiting" },
    { value: "live", label: "Live lot" },
    { value: "closed", label: "Closed" },
    { value: "withdrawn", label: "Withdrawn" },
]

const KYC_TONES: Record<string, PillTone> = { VERIFIED: "green", REJECTED: "red", PENDING: "amber", UNDER_REVIEW: "amber" }

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

const count = (n: number) => n.toLocaleString("en-IN")

const humanize = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ")

// ---------------------------------------------------------------------
// small pieces
// ---------------------------------------------------------------------

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 py-1 text-[12px]">
            <span className="text-[#8A8D94]">{label}</span>
            <span className="min-w-0 wrap-break-word text-slate-800">{children}</span>
        </div>
    )
}

function DetailColumn({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#62666F]">{title}</p>
            {children}
        </div>
    )
}

function SharedIpPill({ bidders }: { bidders: number }) {
    if (bidders < 2) return null
    return <StatusPill tone="red">Shared · {bidders} bidders</StatusPill>
}

function ProxyDetails({
    row,
    onFilterUser,
    onFilterIp,
}: {
    row: ProxyBidRow
    onFilterUser: (row: ProxyBidRow) => void
    onFilterIp: (ip: string) => void
}) {
    const { bidder, lot, auction } = row
    const code = row.currency.code
    const estimate =
        lot.estimateLow || lot.estimateHigh ? [lot.estimateLow, lot.estimateHigh].map((v) => (v ? money(v, code) : "—")).join(" – ") : null

    return (
        <div className="grid grid-cols-1 gap-5 bg-[#FAFAFB] px-4 py-4 lg:grid-cols-3">
            <DetailColumn title="Bidder">
                <DetailRow label="Name">
                    <Link href={`/dashboard/users/${bidder.uuid}`} className="font-semibold hover:text-[#7B2D52] hover:underline">
                        {bidder.name ?? bidder.username}
                    </Link>
                </DetailRow>
                <DetailRow label="Username">{bidder.username}</DetailRow>
                <DetailRow label="Email">{bidder.email}</DetailRow>
                <DetailRow label="Phone">{bidder.phone ?? "—"}</DetailRow>
                <DetailRow label="Paddle">{bidder.paddle ? `#${bidder.paddle}` : "—"}</DetailRow>
                <DetailRow label="KYC">
                    <StatusPill tone={KYC_TONES[bidder.kycStatus] ?? "slate"}>{humanize(bidder.kycStatus)}</StatusPill>
                </DetailRow>
                <DetailRow label="Account">
                    {humanize(bidder.accountStatus)}
                    {bidder.role && <span className="text-[#8A8D94]"> · {humanize(bidder.role)}</span>}
                </DetailRow>
                <DetailRow label="Location">{bidder.location ?? "—"}</DetailRow>
                <div className="mt-3">
                    <Button type="button" variant="outline" className="h-8 bg-white text-[11px]" onClick={() => onFilterUser(row)}>
                        All proxies by this bidder
                    </Button>
                </div>
            </DetailColumn>

            <DetailColumn title="Proxy bid">
                <DetailRow label="Maximum bid">
                    <span className="font-semibold">{money(row.maxAmount, code)}</span>
                </DetailRow>
                <DetailRow label="Result">
                    {PROXY_OUTCOMES[row.outcome].label}
                    <span className="block text-[11px] text-[#8A8D94]">{PROXY_OUTCOMES[row.outcome].hint}</span>
                </DetailRow>
                <DetailRow label="Set at">
                    {formatTime(row.createdAt)} <span className="text-[#8A8D94]">({row.createdAt})</span>
                </DetailRow>
                <DetailRow label="Lot opens">{formatTime(lot.scheduledStartAt)}</DetailRow>
                <DetailRow label="Starting price">{money(lot.startingPrice, code)}</DetailRow>
                {estimate && <DetailRow label="Estimate">{estimate}</DetailRow>}
                <DetailRow label="Reserve">{lot.reservePrice ? money(lot.reservePrice, code) : "None"}</DetailRow>
                <DetailRow label="Current bid">
                    {lot.currentBid ? money(lot.currentBid, code) : "No bids"}
                    {Number(lot.bidCount) > 0 && (
                        <span className="text-[#8A8D94]">
                            {" "}
                            · {count(Number(lot.bidCount))} bid{lot.bidCount === "1" ? "" : "s"}
                            {lot.leading ? " · this bidder leads" : ""}
                        </span>
                    )}
                </DetailRow>
                <DetailRow label="Bids it placed">
                    {row.proxyBids.count === 0
                        ? "None yet"
                        : `${count(row.proxyBids.count)} · up to ${money(row.proxyBids.highest, code)}`}
                </DetailRow>
                {lot.hammerPrice && <DetailRow label="Hammer price">{money(lot.hammerPrice, code)}</DetailRow>}
                {row.withdrawnAt && (
                    <DetailRow label="Withdrawn">
                        {formatTime(row.withdrawnAt)}
                        {row.withdrawnReason && <span className="block text-[11px] text-[#8A8D94]">{row.withdrawnReason}</span>}
                    </DetailRow>
                )}
                <div className="mt-3">
                    <Link
                        href={`/dashboard/bid-history?auction=${auction.uuid}`}
                        className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-900 hover:bg-slate-50"
                    >
                        Lot bid history
                    </Link>
                </div>
            </DetailColumn>

            <DetailColumn title="Where it was set from">
                <DetailRow label="IP address">
                    <span className="font-mono text-[11px]">{row.ipAddress ?? "Not recorded"}</span>
                    {row.ipSharedBy > 1 && (
                        <span className="mt-1 block text-[11px] text-[#C93B3B]">
                            {row.ipSharedBy} different bidders left proxy bids from this IP.
                        </span>
                    )}
                </DetailRow>
                <DetailRow label="Device">
                    {describeDevice(row.userAgent) ?? "—"}
                    {row.userAgent && <span className="block text-[11px] text-[#8A8D94]">{row.userAgent}</span>}
                </DetailRow>
                <DetailRow label="Auction">
                    <Link href={`/dashboard/auctions/${auction.uuid}`} className="hover:text-[#7B2D52] hover:underline">
                        {auction.title}
                    </Link>
                    <span className="block text-[11px] text-[#8A8D94]">
                        {AUCTION_STATUS_LABELS[auction.status] ?? auction.status} · {humanize(auction.auctionType)}
                    </span>
                </DetailRow>
                {row.ipAddress && (
                    <div className="mt-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 bg-white text-[11px]"
                            onClick={() => onFilterIp(row.ipAddress as string)}
                        >
                            All proxies from this IP
                        </Button>
                    </div>
                )}
            </DetailColumn>
        </div>
    )
}

// =====================================================================
// PAGE
// =====================================================================

export function ProxyBids() {
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)
    const canView = !!role && PROXY_AUDIT_ROLES.includes(role)
    const canSwitch = !!role && PROXY_SWITCH_ROLES.includes(role)

    const [searchInput, setSearchInput] = useState("")
    const search = useDebouncedValue(searchInput.trim())
    const [ipInput, setIpInput] = useState("")
    const ip = useDebouncedValue(ipInput.trim())
    const [auction, setAuction] = useState(ALL)
    const [stage, setStage] = useState<ProxyStage>("all")
    // set from a row's "All proxies by this bidder"
    const [user, setUser] = useState<{ uuid: string; label: string } | null>(null)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(PAGE_SIZES[0])
    const [refresh, setRefresh] = useState(0)
    const [open, setOpen] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    const auctionUuid = auction === ALL ? undefined : auction
    const filters: ProxyBidFilters = useMemo(
        () => ({ search: search || undefined, auctionUuid, stage, ip: ip || undefined, userUuid: user?.uuid }),
        [search, auctionUuid, stage, ip, user]
    )

    const listKey = JSON.stringify({ filters, page, limit, refresh })
    const [list, setList] = useState<{ key: string; data: ProxyBidPage | null; error: string | null } | null>(null)
    const [summary, setSummary] = useState<ProxyBidSummary | null>(null)

    useEffect(() => {
        if (!token || !canView) return
        let cancelled = false
        getProxyBids(token, { ...filters, page, limit })
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
    }, [token, canView, filters, page, limit, listKey])

    useEffect(() => {
        if (!token || !canView) return
        let cancelled = false
        getProxyBidSummary(token, auctionUuid)
            .then((data) => {
                if (!cancelled) setSummary(data)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [token, canView, auctionUuid, refresh])

    // operations switch proxy bidding on / off but don't see bidders' IPs and contacts
    if (!canView) {
        return canSwitch ? (
            <ProxySwitches token={token} canEdit />
        ) : (
            <PanelMessage>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Only super admins, admins and auctioneers can view proxy bids.
            </PanelMessage>
        )
    }

    const loading = list?.key !== listKey
    const rows = list?.data?.proxies ?? null
    const pagination = list?.data?.pagination
    const totals = summary?.totals ?? null
    const auctions = summary?.auctions ?? []
    const hasFilters = !!searchInput || !!ipInput || auction !== ALL || stage !== "all" || !!user

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
            setAuction(ALL)
            setStage("all")
            setUser(null)
        })

    const filterByUser = (row: ProxyBidRow) =>
        change(() => {
            setSearchInput("")
            setUser({ uuid: row.bidder.uuid, label: row.bidder.name ?? row.bidder.username })
        })

    const filterByIp = (address: string) => change(() => setIpInput(address))

    const exportCsv = async () => {
        setExporting(true)
        try {
            await downloadProxyBids(token, filters)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile icon={<Bot className="h-4 w-4" />} label="Proxy bids" value={totals?.total ?? null} />
                <StatTile icon={<Clock className="h-4 w-4" />} label="Waiting for their lot" value={totals?.waiting ?? null} />
                <StatTile icon={<Radio className="h-4 w-4" />} label="On a live lot" value={totals?.live ?? null} />
                <StatTile icon={<Trophy className="h-4 w-4" />} label="Won" value={totals?.won ?? null} />
                <StatTile icon={<Users className="h-4 w-4" />} label="Bidders" value={totals?.bidders ?? null} />
                <StatTile icon={<Globe className="h-4 w-4" />} label="Unique IP addresses" value={totals?.uniqueIps ?? null} />
                <StatTile icon={<ShieldAlert className="h-4 w-4" />} label="IPs shared by bidders" value={totals?.sharedIps ?? null} tone="red" />
                <StatTile icon={<UserX className="h-4 w-4" />} label="Withdrawn" value={totals?.withdrawn ?? null} tone="red" />
            </div>

            <ProxySwitches token={token} canEdit={canSwitch} />

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
                            placeholder="Search bidder, email, paddle, lot, IP…"
                            className="h-10 bg-white pl-9 text-[13px]"
                        />
                    </div>

                    <Select value={auction} onValueChange={(value) => value !== null && change(() => setAuction(value))}>
                        <SelectTrigger className="h-10 w-64 bg-white text-[13px]" aria-label="Filter by auction">
                            <SelectValue>
                                <span className="truncate">
                                    {auction === ALL ? "All auctions" : (auctions.find((a) => a.uuid === auction)?.title ?? "Auction")}
                                </span>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-80 bg-white">
                            <SelectGroup>
                                <SelectItem value={ALL}>All auctions</SelectItem>
                                {auctions.map((a) => (
                                    <SelectItem key={a.uuid} value={a.uuid}>
                                        {a.title}
                                        <span className="ml-1 text-[11px] text-[#8A8D94]">· {AUCTION_STATUS_LABELS[a.status] ?? a.status}</span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    <Segmented value={stage} options={STAGE_OPTIONS} onChange={(value) => change(() => setStage(value))} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                        value={ipInput}
                        onChange={(e) => change(() => setIpInput(e.target.value))}
                        placeholder="IP address"
                        className="h-10 w-full bg-white text-[13px] sm:w-44"
                    />
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
                            <RefreshCw className={cn("h-3.5 w-3.5", loading && rows && "animate-spin")} />
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
                        Showing proxy bids by
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F6E9EF] px-2 py-0.5 font-semibold text-[#7B2D52]">
                            {user.label}
                            <button type="button" aria-label="Show every bidder" onClick={() => change(() => setUser(null))} className="cursor-pointer">
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    </div>
                )}

                {/* table */}
                <div className="mt-4">
                    {!rows ? (
                        list?.error ? (
                            <PanelMessage>{list.error}</PanelMessage>
                        ) : (
                            <PanelMessage>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading proxy bids…
                            </PanelMessage>
                        )
                    ) : rows.length === 0 ? (
                        <PanelMessage>{hasFilters ? "No proxy bids match these filters." : "No proxy bids have been left yet."}</PanelMessage>
                    ) : (
                        <div className={cn("overflow-x-auto rounded-lg border border-slate-200 bg-white", loading && "opacity-60")}>
                            <table className="w-full min-w-240 text-left text-[12px]">
                                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-[#62666F]">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold">Set at</th>
                                        <th className="px-4 py-2.5 font-semibold">Bidder</th>
                                        <th className="px-4 py-2.5 font-semibold">Lot</th>
                                        <th className="px-4 py-2.5 text-right font-semibold">Maximum bid</th>
                                        <th className="px-4 py-2.5 font-semibold">Result</th>
                                        <th className="px-4 py-2.5 font-semibold">IP address</th>
                                        <th className="w-10 px-2 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const isOpen = open === row.id
                                        const outcome = PROXY_OUTCOMES[row.outcome]
                                        return (
                                            <Fragment key={row.id}>
                                                <tr
                                                    onClick={() => setOpen(isOpen ? null : row.id)}
                                                    className={cn(
                                                        "cursor-pointer border-b border-slate-100 align-top transition-colors hover:bg-slate-50",
                                                        isOpen && "bg-slate-50"
                                                    )}
                                                >
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <p className="text-slate-900">{formatTime(row.createdAt)}</p>
                                                        <p className="text-[11px] text-[#8A8D94]">{timeAgo(row.createdAt)}</p>
                                                    </td>
                                                    <td className="max-w-55 px-4 py-3">
                                                        <p className="truncate font-semibold text-slate-900">
                                                            <Link
                                                                href={`/dashboard/users/${row.bidder.uuid}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="hover:text-[#7B2D52] hover:underline"
                                                            >
                                                                {row.bidder.name ?? row.bidder.username}
                                                            </Link>
                                                        </p>
                                                        <p className="truncate text-[11px] text-[#8A8D94]">
                                                            {[row.bidder.paddle ? `#${row.bidder.paddle}` : null, row.bidder.email].filter(Boolean).join(" · ")}
                                                        </p>
                                                    </td>
                                                    <td className="max-w-70 px-4 py-3">
                                                        <p className="line-clamp-1 text-slate-900">
                                                            Lot #{row.lot.itemNumber} · {row.lot.title}
                                                        </p>
                                                        <p className="line-clamp-1 text-[11px] text-[#8A8D94]">{row.auction.title}</p>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-right">
                                                        <p className="font-semibold tabular-nums text-slate-900">{money(row.maxAmount, row.currency.code)}</p>
                                                        {row.lot.currentBid && (
                                                            <p className="text-[11px] tabular-nums text-[#8A8D94]">
                                                                now {money(row.lot.currentBid, row.currency.code)}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <span title={outcome.hint}>
                                                            <StatusPill tone={outcome.tone}>{outcome.label}</StatusPill>
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <p className="font-mono text-[11px] text-slate-900">{row.ipAddress ?? "—"}</p>
                                                        <p className="text-[11px] text-[#8A8D94]">{describeDevice(row.userAgent) ?? ""}</p>
                                                        <SharedIpPill bidders={row.ipSharedBy} />
                                                    </td>
                                                    <td className="px-2 py-3 text-slate-400">
                                                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                                                    </td>
                                                </tr>
                                                {isOpen && (
                                                    <tr className="border-b border-slate-100">
                                                        <td colSpan={7} className="p-0">
                                                            <ProxyDetails row={row} onFilterUser={filterByUser} onFilterIp={filterByIp} />
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
                            {count(Math.min(pagination.page * pagination.limit, pagination.total))} of {count(pagination.total)} proxy bids
                        </span>
                        <div className="flex items-center gap-2">
                            <Select value={String(limit)} onValueChange={(value) => value !== null && change(() => setLimit(Number(value)))}>
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
