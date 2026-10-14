"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Gavel, MoreHorizontal, Pencil, Radio, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppSelector } from "@/hooks/redux"
import { useServerNow } from "@/hooks/useServerNow"
import type { DashboardLiveAuction } from "@/lib/types/auction.types"

import { money, Panel, PanelMessage, StatusPill } from "./dashboardUi"

const MINUTE = 60 * 1000
const pad = (n: number) => String(n).padStart(2, "0")

/** "03h 45m", "2d 04h", or "Ending…" once the end time has passed */
const timeLeft = (endTime: string, now: number) => {
    const ms = Date.parse(endTime) - now
    if (ms <= 0) return "Ending…"
    const minutes = Math.ceil(ms / MINUTE)
    const days = Math.floor(minutes / (24 * 60))
    const hours = Math.floor((minutes % (24 * 60)) / 60)
    return days > 0 ? `${days}d ${pad(hours)}h` : `${pad(hours)}h ${pad(minutes % 60)}m`
}

// edit + registrations follow the API's role checks
const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN"]

function RowActions({ auction }: { auction: DashboardLiveAuction }) {
    const router = useRouter()
    const role = useAppSelector((state) => state.auth.role)
    const canManage = !!role && MANAGER_ROLES.includes(role)

    return (
        <div className="flex items-center justify-end gap-0.5 text-slate-500">
            <Link
                href={`/dashboard/auctions/${auction.uuid}`}
                className="rounded-md p-1.5 hover:bg-slate-100 hover:text-slate-900"
                aria-label={`View ${auction.title}`}
                title="View auction"
            >
                <Eye className="h-4 w-4" />
            </Link>
            <Link
                href="/dashboard/auctions/live-auctions"
                className="rounded-md p-1.5 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Open the bidding floor"
                title="Bidding floor"
            >
                <Gavel className="h-4 w-4" />
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-slate-900 data-popup-open:bg-slate-100"
                            aria-label={`More actions for ${auction.title}`}
                        />
                    }
                >
                    <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                        className="py-2 text-[13px]"
                        onClick={() => router.push(`/dashboard/go-live?auction=${auction.uuid}`)}
                    >
                        <Radio /> Live studio
                    </DropdownMenuItem>
                    {canManage && (
                        <>
                            <DropdownMenuItem
                                className="py-2 text-[13px]"
                                onClick={() => router.push(`/dashboard/auctions/${auction.uuid}/registrations`)}
                            >
                                <Users /> Registrations
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="py-2 text-[13px]"
                                onClick={() => router.push(`/dashboard/auctions/${auction.uuid}/edit`)}
                            >
                                <Pencil /> Edit auction
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

interface LiveAuctionsTableProps {
    auctions: DashboardLiveAuction[] | null
    failed: boolean
}

export function LiveAuctionsTable({ auctions, failed }: LiveAuctionsTableProps) {
    // "time left" on the server's clock, not this PC's
    const now = useServerNow(30 * 1000)

    return (
        <Panel
            title="Live Auctions"
            description="Monitor active auctions and current bidding activity."
            action={{ label: "View All", href: "/dashboard/auctions/live-auctions" }}
        >
            {!auctions ? (
                <PanelMessage>{failed ? "Couldn't load live auctions." : "Loading…"}</PanelMessage>
            ) : auctions.length === 0 ? (
                <PanelMessage>No auctions are live right now.</PanelMessage>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full min-w-205 text-left text-[12px]">
                        <thead className="bg-[#F6F6F7] text-[11px] font-semibold text-slate-700">
                            <tr>
                                <th className="px-4 py-2.5">Auction</th>
                                <th className="px-3 py-2.5">Category</th>
                                <th className="px-3 py-2.5">Current Bid</th>
                                <th className="px-3 py-2.5">Total Bids</th>
                                <th className="px-3 py-2.5">Bidders</th>
                                <th className="px-3 py-2.5">Time Remaining</th>
                                <th className="px-3 py-2.5">Status</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {auctions.map((auction) => (
                                <tr key={auction.uuid} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/dashboard/auctions/${auction.uuid}`}
                                            className="font-semibold text-slate-900 hover:underline"
                                        >
                                            {auction.title}
                                        </Link>
                                        {auction.liveLot && (
                                            <p className="text-[10px] text-[#8A8D94]">Lot {auction.liveLot.itemNumber} on the block</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-3">{auction.category ?? "—"}</td>
                                    <td className="px-3 py-3 font-semibold text-slate-900">
                                        {money(auction.currentBid, auction.currency.code)}
                                    </td>
                                    <td className="px-3 py-3">{auction.totalBids.toLocaleString("en-IN")}</td>
                                    <td className="px-3 py-3">{auction.bidders.toLocaleString("en-IN")}</td>
                                    <td className="px-3 py-3 font-semibold text-[#7B2D52]">{timeLeft(auction.endTime, now)}</td>
                                    <td className="px-3 py-3">
                                        {auction.status === "PAUSED" ? (
                                            <StatusPill tone="amber">Paused</StatusPill>
                                        ) : (
                                            <StatusPill tone="green">Live</StatusPill>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <RowActions auction={auction} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    )
}
