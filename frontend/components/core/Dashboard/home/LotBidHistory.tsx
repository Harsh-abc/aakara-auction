"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronLeft, ChevronRight, Download, ImageOff, Loader2, RefreshCw, Search, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppSelector } from "@/hooks/redux"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import type {
    AuctionBidHistory,
    AuctionStatus,
    BidHistoryAuctionList,
    BidHistoryBidder,
    BidHistoryFilter,
    LotBidHistory,
    LotStatus,
} from "@/lib/types/auction.types"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import { cn } from "@/lib/utils"
import { getAuctionBidHistory, getBidHistoryAuctions, getLotBidHistory } from "@/services/operations/auction.api"
import { getLotProxies } from "@/services/operations/proxyBid.api"
import type { LotProxies } from "@/lib/types/proxyBid.types"

import { DASHBOARD_TIME_ZONE, describeDevice, money, Panel, PanelMessage, type PillTone, StatusPill } from "./dashboardUi"
import { PROXY_OUTCOMES } from "../proxyBids/proxyDisplay"
import { BID_STATUS } from "./RecentBids"

export const BID_HISTORY_PATH = "/dashboard/bid-history"

const PAGE_SIZE = 8
const STANDALONE_PAGE_SIZE = 12

const FILTERS: { value: BidHistoryFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "live", label: "Live" },
    // not started yet — lots can already hold proxy bids
    { value: "upcoming", label: "Upcoming" },
    { value: "past", label: "Past" },
]

const AUCTION_TONE: Partial<Record<AuctionStatus, PillTone>> = {
    SCHEDULED: "amber",
    PREVIEW: "amber",
    LIVE: "green",
    PAUSED: "amber",
    ENDED: "slate",
    SETTLED: "maroon",
    CANCELLED: "red",
}

const LOT_STATUS: Record<LotStatus, { label: string; tone: PillTone }> = {
    DRAFT: { label: "Draft", tone: "slate" },
    SCHEDULED: { label: "Waiting", tone: "slate" },
    ACTIVE: { label: "On the block", tone: "green" },
    SOLD: { label: "Sold", tone: "maroon" },
    UNSOLD: { label: "Unsold", tone: "red" },
    PASSED: { label: "Passed", tone: "slate" },
    WITHDRAWN: { label: "Withdrawn", tone: "slate" },
}

const OPEN_LOT_STATUSES: LotStatus[] = ["DRAFT", "SCHEDULED", "ACTIVE"]

// ---------------------------------------------------------------------
// formatting (viewer's own time zone, like the rest of the dashboard)
// ---------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: DASHBOARD_TIME_ZONE,
})

/** bids land seconds apart, so the time keeps its seconds */
const bidTimeFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: DASHBOARD_TIME_ZONE,
})

const formatDate = (iso: string) => dateFmt.format(new Date(iso))
const formatBidTime = (iso: string) => bidTimeFmt.format(new Date(iso))
const count = (n: number) => n.toLocaleString("en-IN")

// ---------------------------------------------------------------------
// CSV export — a lot's bids, oldest first, for the auction house's records
// ---------------------------------------------------------------------

const csvCell = (value: string | number) => {
    let text = String(value)
    // stop a spreadsheet reading a name like "=SUM(…)" as a formula
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const slugify = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "auction"

function downloadLotCsv(history: LotBidHistory) {
    const header = ["Bid #", "Placed at (UTC)", "Paddle", "Bidder", "Username", "Amount", "Currency", "Source", "Status"]
    const rows = [...history.bids]
        .reverse()
        .map((bid) => [
            bid.seq,
            bid.placedAt,
            bid.bidder?.paddle ?? "",
            bid.bidder?.name ?? "",
            bid.bidder?.username ?? "",
            bid.amount,
            history.lot.currency.code,
            bid.source === "PROXY" ? "Proxy" : bid.source === "FLOOR" ? "Floor" : "Manual",
            BID_STATUS[bid.status]?.label ?? bid.status,
        ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")

    // BOM so Excel reads ₹ and names in UTF-8
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${slugify(history.auction.title)}-lot-${history.lot.itemNumber}-bids.csv`
    link.click()
    URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------
// small pieces
// ---------------------------------------------------------------------

function BidderCell({ bidder }: { bidder: BidHistoryBidder | null }) {
    if (!bidder) return <span className="text-[#8A8D94]">Unknown bidder</span>
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6E9EF] text-[#7B2D52]">
                <User className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                    {bidder.paddle ? `Bidder #${bidder.paddle}` : bidder.name ?? `@${bidder.username}`}
                </p>
                <p className="truncate text-[10px] text-[#8A8D94]">
                    {[bidder.paddle ? bidder.name : null, `@${bidder.username}`].filter(Boolean).join(" · ")}
                </p>
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
        <div className="flex gap-1 rounded-md bg-white p-1 ring-1 ring-slate-200">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "cursor-pointer rounded px-3 py-1 text-[11px] font-semibold transition-colors",
                        value === option.value ? "bg-[#7B2D52] text-white" : "text-slate-500 hover:text-slate-800"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

const Loading = ({ children = "Loading…" }: { children?: React.ReactNode }) => (
    <PanelMessage>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {children}
    </PanelMessage>
)

// =====================================================================
// PANEL
// =====================================================================

interface LotBidHistoryProps {
    /** On its own page (longer list, sale kept in ?auction=) rather than a dashboard panel */
    standalone?: boolean
    /** Sale to open first, e.g. from ?auction= */
    initialAuction?: string | null
}

export function LotBidHistory({ standalone = false, initialAuction = null }: LotBidHistoryProps) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const router = useRouter()
    const pageSize = standalone ? STANDALONE_PAGE_SIZE : PAGE_SIZE

    const [filter, setFilter] = useState<BidHistoryFilter>("all")
    const [searchInput, setSearchInput] = useState("")
    const search = useDebouncedValue(searchInput.trim())
    const [page, setPage] = useState(1)
    // null = the first sale in the list
    const [chosen, setChosen] = useState<string | null>(initialAuction)
    // bumped by the refresh button — reloads the list, the sale and any open lot
    const [refresh, setRefresh] = useState(0)

    const listKey = `${filter}|${search}|${page}|${refresh}`
    const [list, setList] = useState<{ key: string; data: BidHistoryAuctionList | null; failed: boolean } | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getBidHistoryAuctions(token, { status: filter, search, page, limit: pageSize })
            .then((data) => {
                if (!cancelled) setList({ key: listKey, data, failed: false })
            })
            .catch(() => {
                // keep showing the last good list
                if (!cancelled) setList((prev) => ({ key: listKey, data: prev?.data ?? null, failed: true }))
            })
        return () => {
            cancelled = true
        }
    }, [token, filter, search, page, pageSize, listKey])

    const loadingList = list?.key !== listKey
    const auctions = list?.data?.auctions ?? null
    const pagination = list?.data?.pagination
    // the chosen sale (it may come from a link and sit on another page of the list), or the first one
    const selected = chosen ?? auctions?.[0]?.uuid ?? null

    const choose = (auctionUuid: string | null) => {
        setChosen(auctionUuid)
        // keeps the page's link pointing at the open sale
        if (standalone) router.replace(auctionUuid ? `${BID_HISTORY_PATH}?auction=${auctionUuid}` : BID_HISTORY_PATH, { scroll: false })
    }
    // a new filter / search / page starts at its first sale
    const changeList = (change: () => void) => {
        change()
        if (chosen) choose(null)
    }

    return (
        <Panel
            title={standalone ? "Auctions" : "Lot Bid History"}
            description={
                standalone
                    ? "Pick an auction, then open a lot to see every bid and bidder on it."
                    : "Every bid and bidder on each lot, kept after the sale ends."
            }
            action={
                standalone
                    ? undefined
                    : { label: "Open Full History", href: selected ? `${BID_HISTORY_PATH}?auction=${selected}` : BID_HISTORY_PATH }
            }
        >
            {/* toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Segmented
                    value={filter}
                    options={FILTERS}
                    onChange={(value) =>
                        changeList(() => {
                            setFilter(value)
                            setPage(1)
                        })
                    }
                />
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={searchInput}
                        onChange={(e) =>
                            changeList(() => {
                                setSearchInput(e.target.value)
                                setPage(1)
                            })
                        }
                        placeholder="Search auctions"
                        className="h-8 bg-white pl-8 text-[12px]"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="ml-auto h-8 gap-1.5 bg-white text-[11px]"
                    onClick={() => setRefresh((n) => n + 1)}
                    disabled={loadingList}
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", loadingList && auctions && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {!auctions ? (
                list?.failed ? (
                    <PanelMessage>Couldn&apos;t load the bid history.</PanelMessage>
                ) : (
                    <Loading />
                )
            ) : auctions.length === 0 ? (
                <PanelMessage>
                    {search
                        ? "No auctions match your search."
                        : "No scheduled, live or finished auctions yet — proxy bids show up here once a sale is scheduled, bids once it goes live."}
                </PanelMessage>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.6fr)]">
                    {/* sales */}
                    <div className="flex flex-col gap-2">
                        <ul className={cn("flex flex-col gap-1.5", loadingList && "opacity-60")}>
                            {auctions.map((auction) => (
                                <li key={auction.uuid}>
                                    <button
                                        type="button"
                                        onClick={() => choose(auction.uuid)}
                                        className={cn(
                                            "w-full cursor-pointer rounded-lg border bg-white px-3 py-2.5 text-left transition-colors",
                                            auction.uuid === selected
                                                ? "border-[#7B2D52] ring-1 ring-[#7B2D52]"
                                                : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="line-clamp-2 text-[12px] font-semibold text-slate-900">{auction.title}</p>
                                            <StatusPill tone={AUCTION_TONE[auction.status] ?? "slate"}>
                                                {AUCTION_STATUS_LABELS[auction.status]}
                                            </StatusPill>
                                        </div>
                                        <p className="mt-1 text-[10px] text-[#8A8D94]">
                                            {formatDate(auction.startTime)} · {count(auction.lotCount)} lots ·{" "}
                                            {count(auction.totalBids)} bids
                                        </p>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between text-[11px] text-[#62666F]">
                                <span>
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 bg-white"
                                        disabled={page <= 1 || loadingList}
                                        onClick={() => changeList(() => setPage((p) => p - 1))}
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 bg-white"
                                        disabled={page >= pagination.totalPages || loadingList}
                                        onClick={() => changeList(() => setPage((p) => p + 1))}
                                        aria-label="Next page"
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* the chosen sale's lots */}
                    {token && selected && (
                        <AuctionLots key={selected} token={token} auctionUuid={selected} refresh={refresh} />
                    )}
                </div>
            )}
        </Panel>
    )
}

// =====================================================================
// ONE SALE — its lots, each expandable to its bids
// =====================================================================

function AuctionLots({ token, auctionUuid, refresh }: { token: string; auctionUuid: string; refresh: number }) {
    const key = `${auctionUuid}|${refresh}`
    const [state, setState] = useState<{ key: string; data: AuctionBidHistory | null; failed: boolean } | null>(null)
    const [open, setOpen] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getAuctionBidHistory(token, auctionUuid)
            .then((data) => {
                if (!cancelled) setState({ key, data, failed: false })
            })
            .catch(() => {
                if (!cancelled) setState((prev) => ({ key, data: prev?.data ?? null, failed: true }))
            })
        return () => {
            cancelled = true
        }
    }, [token, auctionUuid, key])

    const data = state?.data
    if (!data) return state?.failed ? <PanelMessage>Couldn&apos;t load this auction&apos;s lots.</PanelMessage> : <Loading />

    const { auction, lots } = data

    return (
        <div className={cn("flex min-w-0 flex-col gap-3", state?.key !== key && "opacity-60")}>
            {/* sale header */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0">
                    <Link
                        href={`/dashboard/auctions/${auction.uuid}`}
                        className="text-[14px] font-bold text-slate-900 hover:underline"
                    >
                        {auction.title}
                    </Link>
                    <p className="text-[11px] text-[#62666F]">
                        {formatDate(auction.startTime)} – {formatDate(auction.endTime)}
                    </p>
                </div>
                <dl className="flex gap-5 text-[11px]">
                    {[
                        ["Lots", auction.lotCount],
                        ["Bids", auction.totalBids],
                        ["Bidders", auction.bidders],
                        ["Proxy bids", auction.proxyBids],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-[#8A8D94]">{label}</dt>
                            <dd className="text-[15px] font-bold text-slate-900">{count(value as number)}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            {lots.length === 0 ? (
                <PanelMessage>This auction has no lots.</PanelMessage>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full min-w-170 text-left text-[12px]">
                        <thead className="bg-[#F6F6F7] text-[11px] font-semibold text-slate-700">
                            <tr>
                                <th className="w-8 py-2.5 pl-3" />
                                <th className="px-3 py-2.5">Lot</th>
                                <th className="px-3 py-2.5">Status</th>
                                <th className="px-3 py-2.5">Bids</th>
                                <th className="px-3 py-2.5">Bidders</th>
                                <th className="px-3 py-2.5">Proxies</th>
                                <th className="px-3 py-2.5">Top Bid</th>
                                <th className="px-4 py-2.5">Top Bidder</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {lots.map((lot) => {
                                const isOpen = open === lot.uuid
                                const status = LOT_STATUS[lot.status] ?? LOT_STATUS.DRAFT
                                const hasBids = lot.bidCount > 0
                                // a lot that hasn't opened can still hold proxy bids
                                const expandable = hasBids || lot.proxyCount > 0
                                return (
                                    <Fragment key={lot.uuid}>
                                        <tr
                                            className={cn(
                                                expandable ? "cursor-pointer hover:bg-slate-50/60" : "text-slate-500",
                                                isOpen && "bg-slate-50/80"
                                            )}
                                            onClick={expandable ? () => setOpen(isOpen ? null : lot.uuid) : undefined}
                                        >
                                            <td className="py-3 pl-3">
                                                {expandable && (
                                                    <button
                                                        type="button"
                                                        aria-expanded={isOpen}
                                                        aria-label={`${isOpen ? "Hide" : "Show"} bids on lot ${lot.itemNumber}`}
                                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                                                    >
                                                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-slate-100">
                                                        {lot.imageUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={lot.imageUrl} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full items-center justify-center text-slate-300">
                                                                <ImageOff className="h-3.5 w-3.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-semibold text-[#7B2D52]">Lot {lot.itemNumber}</p>
                                                        <p className="max-w-56 truncate font-semibold text-slate-900">{lot.title}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                            </td>
                                            <td className="px-3 py-3">{count(lot.bidCount)}</td>
                                            <td className="px-3 py-3">{count(lot.bidders)}</td>
                                            <td className="px-3 py-3">
                                                {lot.proxyCount > 0 ? (
                                                    <StatusPill tone="maroon">{count(lot.proxyCount)}</StatusPill>
                                                ) : (
                                                    <span className="text-[#8A8D94]">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 font-semibold text-slate-900">
                                                {hasBids ? money(lot.topBid, lot.currency.code) : (
                                                    <span className="font-normal text-[#8A8D94]">
                                                        Opens at {money(lot.startingPrice, lot.currency.code)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {lot.leader ? (
                                                    <div>
                                                        <BidderCell bidder={lot.leader} />
                                                        <p className="mt-0.5 pl-9.5 text-[10px] text-[#8A8D94]">
                                                            {OPEN_LOT_STATUSES.includes(lot.status)
                                                                ? "Leading"
                                                                : lot.status === "SOLD"
                                                                  ? "Winner"
                                                                  : "Top bid, not sold"}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[#8A8D94]">—</span>
                                                )}
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr>
                                                <td colSpan={8} className="bg-[#FBFBFC] px-3 py-3">
                                                    <LotBids
                                                        token={token}
                                                        lotUuid={lot.uuid}
                                                        refresh={refresh}
                                                        proxyCount={lot.proxyCount}
                                                        initialView={hasBids ? "bids" : "proxies"}
                                                    />
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
    )
}

// =====================================================================
// ONE LOT — every bid, or a line per bidder
// =====================================================================

type LotView = "bids" | "bidders" | "proxies"

function LotBids({
    token,
    lotUuid,
    refresh,
    proxyCount,
    initialView,
}: {
    token: string
    lotUuid: string
    refresh: number
    proxyCount: number
    initialView: LotView
}) {
    const key = `${lotUuid}|${refresh}`
    const [state, setState] = useState<{ key: string; data: LotBidHistory | null; failed: boolean } | null>(null)
    const [view, setView] = useState<LotView>(initialView)

    useEffect(() => {
        let cancelled = false
        getLotBidHistory(token, lotUuid)
            .then((data) => {
                if (!cancelled) setState({ key, data, failed: false })
            })
            .catch(() => {
                if (!cancelled) setState((prev) => ({ key, data: prev?.data ?? null, failed: true }))
            })
        return () => {
            cancelled = true
        }
    }, [token, lotUuid, key])

    const history = state?.data
    if (!history) {
        return state?.failed ? (
            <PanelMessage>Couldn&apos;t load the bids on this lot.</PanelMessage>
        ) : (
            <Loading>Loading bids…</Loading>
        )
    }

    const currency = history.lot.currency.code

    return (
        <div className={cn("flex flex-col gap-2.5", state?.key !== key && "opacity-60")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Segmented<LotView>
                    value={view}
                    onChange={setView}
                    options={[
                        { value: "bids", label: `All bids (${count(history.summary.totalBids)})` },
                        { value: "bidders", label: `Bidders (${count(history.summary.bidders)})` },
                        { value: "proxies", label: `Proxy bids (${count(proxyCount)})` },
                    ]}
                />
                {view !== "proxies" && (
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 gap-1.5 bg-white text-[11px]"
                        onClick={() => downloadLotCsv(history)}
                        disabled={history.bids.length === 0}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </Button>
                )}
            </div>

            {view === "proxies" ? (
                <LotProxyTable token={token} lotUuid={lotUuid} refresh={refresh} />
            ) : history.bids.length === 0 ? (
                <PanelMessage>No bids on this lot.</PanelMessage>
            ) : view === "bids" ? (
                <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full min-w-150 text-left text-[12px]">
                        <thead className="sticky top-0 bg-[#F6F6F7] text-[11px] font-semibold text-slate-700">
                            <tr>
                                <th className="px-4 py-2">#</th>
                                <th className="px-3 py-2">Bidder</th>
                                <th className="px-3 py-2">Amount</th>
                                <th className="px-3 py-2">Type</th>
                                <th className="px-3 py-2">Placed At</th>
                                <th className="px-4 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {history.bids.map((bid) => {
                                const status = BID_STATUS[bid.status] ?? BID_STATUS.CANCELLED
                                return (
                                    <tr key={bid.uuid}>
                                        <td className="px-4 py-2.5 text-[#8A8D94]">{bid.seq}</td>
                                        <td className="px-3 py-2.5">
                                            <BidderCell bidder={bid.bidder} />
                                        </td>
                                        <td className="px-3 py-2.5 font-semibold text-slate-900">{money(bid.amount, currency)}</td>
                                        <td className="px-3 py-2.5">{bid.source === "PROXY" ? "Proxy" : bid.source === "FLOOR" ? "Floor" : "Manual"}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-[#62666F]">{formatBidTime(bid.placedAt)}</td>
                                        <td className="px-4 py-2.5">
                                            <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full min-w-150 text-left text-[12px]">
                        <thead className="sticky top-0 bg-[#F6F6F7] text-[11px] font-semibold text-slate-700">
                            <tr>
                                <th className="px-4 py-2">Bidder</th>
                                <th className="px-3 py-2">Bids</th>
                                <th className="px-3 py-2">Highest Bid</th>
                                <th className="px-3 py-2">First Bid</th>
                                <th className="px-3 py-2">Last Bid</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {history.bidders.map((row, index) => {
                                const status = row.top && history.summary.leaderStatus ? BID_STATUS[history.summary.leaderStatus] : null
                                return (
                                    <tr key={row.bidder?.uuid ?? index}>
                                        <td className="px-4 py-2.5">
                                            <BidderCell bidder={row.bidder} />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {count(row.bids)}
                                            <p className="text-[10px] text-[#8A8D94]">
                                                {row.manualBids} manual · {row.proxyBids} proxy
                                            </p>
                                        </td>
                                        <td className="px-3 py-2.5 font-semibold text-slate-900">{money(row.highestBid, currency)}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-[#62666F]">{formatBidTime(row.firstBidAt)}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-[#62666F]">{formatBidTime(row.lastBidAt)}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// =====================================================================
// ONE LOT — its proxy (maximum) bids, strongest first
// =====================================================================

function LotProxyTable({ token, lotUuid, refresh }: { token: string; lotUuid: string; refresh: number }) {
    const key = `${lotUuid}|${refresh}`
    const [state, setState] = useState<{ key: string; data: LotProxies | null; failed: boolean } | null>(null)

    useEffect(() => {
        let cancelled = false
        getLotProxies(lotUuid, token)
            .then((data) => {
                if (!cancelled) setState({ key, data, failed: false })
            })
            .catch(() => {
                if (!cancelled) setState((prev) => ({ key, data: prev?.data ?? null, failed: true }))
            })
        return () => {
            cancelled = true
        }
    }, [token, lotUuid, key])

    const data = state?.data
    if (!data) {
        return state?.failed ? <PanelMessage>Couldn&apos;t load the proxy bids on this lot.</PanelMessage> : <Loading>Loading proxy bids…</Loading>
    }
    if (data.proxies.length === 0) return <PanelMessage>No proxy bids on this lot.</PanelMessage>

    const { canSeeOrigin } = data

    return (
        <div className={cn("max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white", state?.key !== key && "opacity-60")}>
            <table className="w-full min-w-170 text-left text-[12px]">
                <thead className="sticky top-0 bg-[#F6F6F7] text-[11px] font-semibold text-slate-700">
                    <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-3 py-2">Bidder</th>
                        <th className="px-3 py-2">Maximum Bid</th>
                        <th className="px-3 py-2">Bids Placed</th>
                        <th className="px-3 py-2">Set At</th>
                        {canSeeOrigin && <th className="px-3 py-2">IP Address</th>}
                        <th className="px-4 py-2">Result</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.proxies.map((row, index) => {
                        const outcome = PROXY_OUTCOMES[row.outcome]
                        const code = row.currency.code
                        return (
                            <tr key={row.id} className={cn(row.withdrawnAt && "text-slate-400")}>
                                <td className="px-4 py-2.5 text-[#8A8D94]">{row.withdrawnAt ? "—" : index + 1}</td>
                                <td className="px-3 py-2.5">
                                    <BidderCell bidder={row.bidder} />
                                    {canSeeOrigin && (row.bidder.email || row.bidder.phone) && (
                                        <p className="mt-0.5 truncate pl-9.5 text-[10px] text-[#8A8D94]">
                                            {[row.bidder.email, row.bidder.phone].filter(Boolean).join(" · ")}
                                        </p>
                                    )}
                                </td>
                                <td className={cn("px-3 py-2.5 font-semibold", row.withdrawnAt ? "line-through" : "text-slate-900")}>
                                    {money(row.maxAmount, code)}
                                </td>
                                <td className="px-3 py-2.5">
                                    {row.proxyBids.count === 0 ? (
                                        <span className="text-[#8A8D94]">None yet</span>
                                    ) : (
                                        <>
                                            {count(row.proxyBids.count)}
                                            <p className="text-[10px] text-[#8A8D94]">up to {money(row.proxyBids.highest, code)}</p>
                                        </>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-[#62666F]">{formatBidTime(row.createdAt)}</td>
                                {canSeeOrigin && (
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        <p className="font-mono text-[11px] text-slate-900">{row.ipAddress ?? "—"}</p>
                                        <p className="text-[10px] text-[#8A8D94]">{describeDevice(row.userAgent) ?? ""}</p>
                                        {row.ipSharedBy > 1 && <StatusPill tone="red">Shared · {row.ipSharedBy} bidders</StatusPill>}
                                    </td>
                                )}
                                <td className="px-4 py-2.5">
                                    <span title={outcome.hint}>
                                        <StatusPill tone={outcome.tone}>{outcome.label}</StatusPill>
                                    </span>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
