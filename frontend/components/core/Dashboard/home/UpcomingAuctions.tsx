import Link from "next/link"
import { ImageOff } from "lucide-react"

import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { DashboardUpcomingAuction } from "@/lib/types/auction.types"

import { formatStart, money, Panel, PanelMessage, StatusPill } from "./dashboardUi"

interface UpcomingAuctionsProps {
    auctions: DashboardUpcomingAuction[] | null
    failed: boolean
}

export function UpcomingAuctions({ auctions, failed }: UpcomingAuctionsProps) {
    return (
        <Panel
            title="Upcoming Auctions"
            description="Auctions scheduled to begin soon."
            action={auctions?.length ? { label: "View All", href: "/dashboard/auctions/upcoming-auctions" } : undefined}
        >
            {!auctions ? (
                <PanelMessage>{failed ? "Couldn't load upcoming auctions." : "Loading…"}</PanelMessage>
            ) : auctions.length === 0 ? (
                <PanelMessage>
                    No auctions are scheduled.{" "}
                    <Link href="/dashboard/auctions/create-auctions" className="ml-1 font-semibold text-[#7B2D52] hover:underline">
                        Schedule one
                    </Link>
                </PanelMessage>
            ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {auctions.map((auction) => (
                        <li key={auction.uuid}>
                            <Link
                                href={`/dashboard/auctions/${auction.uuid}`}
                                className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-3 py-3 hover:bg-slate-50 md:grid-cols-[44px_1.3fr_1.2fr_1fr_auto]"
                            >
                                <span className="h-11 w-11 overflow-hidden rounded-md bg-[#F3F0E9]">
                                    {auction.coverImageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={auction.coverImageUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="flex h-full items-center justify-center text-slate-300">
                                            <ImageOff className="h-4 w-4" />
                                        </span>
                                    )}
                                </span>

                                <span className="line-clamp-2 text-[13px] font-semibold text-slate-900">{auction.title}</span>

                                <span className="hidden md:block">
                                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#8A8D94]">
                                        Start date
                                    </span>
                                    <span className="text-[12px] text-slate-700">{formatStart(auction.startTime)}</span>
                                </span>

                                <span className="hidden md:block">
                                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#8A8D94]">
                                        Starting bid
                                    </span>
                                    <span className="text-[12px] font-semibold text-slate-800">
                                        {money(auction.startingBid, auction.currency.code)}
                                    </span>
                                </span>

                                <StatusPill tone="amber">{AUCTION_STATUS_LABELS[auction.status]}</StatusPill>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}
