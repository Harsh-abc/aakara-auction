"use client"

import { useEffect, useState } from "react"
import { formatDistanceStrict } from "date-fns"
import { User } from "lucide-react"

import type { DashboardBid, DashboardBidStatus } from "@/lib/types/auction.types"

import { money, Panel, PanelMessage, StatusPill } from "./dashboardUi"

const STATUS: Record<DashboardBidStatus, { label: string; tone: "green" | "red" | "slate" }> = {
    LEADING: { label: "Highest bid", tone: "green" },
    OUTBID: { label: "Outbid", tone: "red" },
    WON: { label: "Won", tone: "green" },
    LOST: { label: "Reserve not met", tone: "slate" },
    CANCELLED: { label: "Cancelled", tone: "slate" },
}

const bidderLabel = (bid: DashboardBid) =>
    bid.bidder?.paddle ? `Bidder #${bid.bidder.paddle}` : bid.bidder?.name ?? "Unknown bidder"

const ago = (iso: string, now: number) => {
    const ms = now - Date.parse(iso)
    return ms < 60 * 1000 ? "Just now" : `${formatDistanceStrict(Date.parse(iso), now)} ago`
}

interface RecentBidsProps {
    bids: DashboardBid[] | null
    failed: boolean
}

export function RecentBids({ bids, failed }: RecentBidsProps) {
    const [now, setNow] = useState(() => Date.now())

    // keeps "2 min ago" honest between refreshes
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30 * 1000)
        return () => clearInterval(id)
    }, [])

    return (
        <Panel
            title="Recent Bid Activity"
            description="Latest bids placed across your auctions."
            action={{ label: "View All Bids", href: "/dashboard/auctions/live-auctions" }}
        >
            {!bids ? (
                <PanelMessage>{failed ? "Couldn't load recent bids." : "Loading…"}</PanelMessage>
            ) : bids.length === 0 ? (
                <PanelMessage>No bids have been placed yet.</PanelMessage>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full min-w-160 text-left text-[12px]">
                        <thead className="bg-[#F6F6F7] text-[11px] font-semibold text-slate-700">
                            <tr>
                                <th className="px-4 py-2.5">Bidder</th>
                                <th className="px-3 py-2.5">Auction</th>
                                <th className="px-3 py-2.5">Bid Amount</th>
                                <th className="px-3 py-2.5">Bid Time</th>
                                <th className="px-4 py-2.5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {bids.map((bid) => {
                                const status = STATUS[bid.status] ?? STATUS.CANCELLED
                                return (
                                    <tr key={`${bid.uuid}:${bid.placedAt}`} className="hover:bg-slate-50/60">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6E9EF] text-[#7B2D52]">
                                                    <User className="h-3.5 w-3.5" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900">{bidderLabel(bid)}</p>
                                                    {bid.bidder?.paddle && bid.bidder.name && (
                                                        <p className="truncate text-[10px] text-[#8A8D94]">{bid.bidder.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="text-slate-800">{bid.auction.title}</p>
                                            <p className="text-[10px] text-[#8A8D94]">
                                                Lot {bid.lot.itemNumber}
                                                {bid.source === "PROXY" && " · proxy"}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 font-semibold text-slate-900">
                                            {money(bid.amount, bid.currency.code)}
                                        </td>
                                        <td className="px-3 py-3 text-[#62666F]">{ago(bid.placedAt, now)}</td>
                                        <td className="px-4 py-3">
                                            <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    )
}
