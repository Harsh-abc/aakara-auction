"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { ProxyBidRow } from "@/lib/types/proxyBid.types"
import type { User } from "@/lib/types/user.types"
import { downloadProxyBids, getProxyBids } from "@/services/operations/proxyBid.api"

import { DASHBOARD_TIME_ZONE, money, StatusPill } from "../home/dashboardUi"
import { PROXY_OUTCOMES } from "../proxyBids/proxyDisplay"

/*
 * Proxy bids on the user page: every maximum bid this user left, grouped by
 * auction with the lots in catalogue order, plus a CSV of the same.
 */

// mirror PROXY_AUDIT_ROLES in backend/src/routes/bidding.routes.js
const PROXY_AUDIT_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER"]
const PAGE = 100 // the API's largest page
const MAX_ROWS = 1000 // more than any one bidder realistically leaves; the CSV has the rest

const timeFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: DASHBOARD_TIME_ZONE,
})

interface AuctionGroup {
    auction: ProxyBidRow["auction"]
    rows: ProxyBidRow[]
}

const groupByAuction = (rows: ProxyBidRow[]): AuctionGroup[] => {
    const groups = new Map<string, AuctionGroup>()
    for (const row of rows) {
        const group = groups.get(row.auction.uuid) ?? { auction: row.auction, rows: [] }
        group.rows.push(row)
        groups.set(row.auction.uuid, group)
    }
    for (const group of groups.values()) {
        group.rows.sort((a, b) => Number(a.lot.itemNumber) - Number(b.lot.itemNumber))
    }
    return [...groups.values()]
}

const fileSlug = (value: string) => value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "user"

export function UserProxyBids({ user }: { user: User }) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)
    const canView = !!role && PROXY_AUDIT_ROLES.includes(role)

    const [state, setState] = useState<{ uuid: string; rows: ProxyBidRow[]; total: number; error: string | null } | null>(null)
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        if (!canView) return
        let cancelled = false
        ;(async () => {
            try {
                const rows: ProxyBidRow[] = []
                let total = 0
                for (let page = 1; rows.length < MAX_ROWS; page++) {
                    const res = await getProxyBids(token, { userUuid: user.uuid, page, limit: PAGE })
                    rows.push(...res.proxies)
                    total = res.pagination.total
                    if (page >= res.pagination.totalPages) break
                }
                if (!cancelled) setState({ uuid: user.uuid, rows, total, error: null })
            } catch (error) {
                if (!cancelled) setState({ uuid: user.uuid, rows: [], total: 0, error: getErrorMessage(error, "Couldn't load proxy bids") })
            }
        })()
        return () => {
            cancelled = true
        }
    }, [canView, token, user.uuid])

    const loaded = state?.uuid === user.uuid ? state : null
    const groups = useMemo(() => groupByAuction(loaded?.rows ?? []), [loaded])

    if (!canView) return null

    const exportCsv = async () => {
        setExporting(true)
        try {
            await downloadProxyBids(
                token,
                { userUuid: user.uuid },
                `proxy-bids-${fileSlug(user.username)}-${new Date().toISOString().slice(0, 10)}.csv`
            )
        } catch (error) {
            toast.error(getErrorMessage(error, "Couldn't download the CSV"))
        } finally {
            setExporting(false)
        }
    }

    return (
        <section className="mt-6 rounded-[8px] bg-[#f8f8f8] px-5 py-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-[16px] font-bold text-[#0F172A]">
                        Proxy bids
                        {loaded && !loaded.error && (
                            <span className="ml-2 rounded-full bg-[#e7e7e7] px-2 py-0.5 text-[11px] font-medium text-[#414141]">
                                {loaded.total.toLocaleString("en-IN")} across {groups.length} auction{groups.length === 1 ? "" : "s"}
                            </span>
                        )}
                    </h2>
                    <p className="text-[12px] text-[#62666F]">Maximum bids this user left, auction by auction and lot by lot.</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/dashboard/proxy-bids?${new URLSearchParams({ user: user.uuid, name: user.username })}`}
                        className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-900 hover:bg-slate-50"
                    >
                        Open in Proxy Bids
                    </Link>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-9 bg-white text-[12px]"
                        onClick={exportCsv}
                        disabled={exporting || !loaded || loaded.total === 0}
                    >
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Download CSV
                    </Button>
                </div>
            </div>

            {!loaded ? (
                <p className="text-sm text-muted-foreground">Loading proxy bids...</p>
            ) : loaded.error ? (
                <p className="text-sm text-red-500">{loaded.error}</p>
            ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">This user hasn&apos;t left any proxy bids.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {loaded.rows.length < loaded.total && (
                        <p className="text-[12px] text-[#8A5B00]">
                            Showing the newest {loaded.rows.length.toLocaleString("en-IN")} — download the CSV for all of them.
                        </p>
                    )}
                    {groups.map(({ auction, rows }) => (
                        <div key={auction.uuid} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                                <Link
                                    href={`/dashboard/auctions/${auction.uuid}`}
                                    className="text-[13px] font-semibold text-slate-900 hover:text-[#7B2D52] hover:underline"
                                >
                                    {auction.title}
                                </Link>
                                <span className="text-[11px] text-[#62666F]">
                                    {AUCTION_STATUS_LABELS[auction.status] ?? auction.status} · {rows.length} lot
                                    {rows.length === 1 ? "" : "s"}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[12px]">
                                    <thead className="text-left text-[11px] uppercase tracking-wide text-[#62666F]">
                                        <tr>
                                            <th className="px-4 py-2 font-semibold">Lot</th>
                                            <th className="px-4 py-2 font-semibold">Title</th>
                                            <th className="px-4 py-2 font-semibold">Paddle</th>
                                            <th className="px-4 py-2 text-right font-semibold">Maximum bid</th>
                                            <th className="px-4 py-2 text-right font-semibold">Bids placed</th>
                                            <th className="px-4 py-2 text-right font-semibold">Current / hammer</th>
                                            <th className="px-4 py-2 font-semibold">Result</th>
                                            <th className="px-4 py-2 font-semibold">Set at</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => {
                                            const code = row.currency.code
                                            const outcome = PROXY_OUTCOMES[row.outcome]
                                            const price = row.lot.hammerPrice ?? row.lot.currentBid
                                            return (
                                                <tr key={row.id} className="border-t border-slate-100">
                                                    <td className="px-4 py-2 font-medium">#{row.lot.itemNumber}</td>
                                                    <td className="max-w-60 truncate px-4 py-2" title={row.lot.title}>
                                                        {row.lot.title}
                                                    </td>
                                                    <td className="px-4 py-2">{row.bidder.paddle ? `#${row.bidder.paddle}` : "—"}</td>
                                                    <td className="px-4 py-2 text-right font-semibold">{money(row.maxAmount, code)}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        {row.proxyBids.count === 0
                                                            ? "—"
                                                            : `${row.proxyBids.count} · up to ${money(row.proxyBids.highest, code)}`}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {price ? money(price, code) : "No bids"}
                                                        {row.lot.hammerPrice && <span className="block text-[10px] text-[#8A8D94]">hammer</span>}
                                                    </td>
                                                    <td className="px-4 py-2" title={outcome.hint}>
                                                        <StatusPill tone={outcome.tone}>{outcome.label}</StatusPill>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-2 text-[#62666F]">
                                                        {timeFmt.format(new Date(row.createdAt))}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
