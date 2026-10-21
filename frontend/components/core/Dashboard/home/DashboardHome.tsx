"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import DashboardFormText from "@/components/common/DashboardFormText"
import { buttonVariants } from "@/components/ui/button"
import { useAppSelector } from "@/hooks/redux"
import { useCanAccessPage } from "@/hooks/useCanAccessPage"
import type { DashboardOverview } from "@/lib/types/auction.types"
import { cn } from "@/lib/utils"
import { getDashboardOverview } from "@/services/operations/auction.api"

import { AuctionCalendar } from "./AuctionCalendar"
import { DashboardStats } from "./DashboardStats"
import { LiveAuctionsTable } from "./LiveAuctionsTable"
import { BID_HISTORY_PATH, LotBidHistory } from "./LotBidHistory"
import { QuickActions } from "./QuickActions"
import { RecentBids } from "./RecentBids"
import { UpcomingAuctions } from "./UpcomingAuctions"

// live bids move fast; the panels refresh on this beat and when the tab comes back into view
const REFRESH_MS = 20 * 1000

export function DashboardHome() {
    const token = useAppSelector((state) => state.auth.accessToken)
    // links / panels only for pages this role can open (lib/constants/dashboardAccess.ts)
    const canAccess = useCanAccessPage()
    const [overview, setOverview] = useState<DashboardOverview | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        if (!token) return
        let cancelled = false

        const load = () =>
            getDashboardOverview(token)
                .then((data) => {
                    if (cancelled) return
                    setOverview(data)
                    setFailed(false)
                })
                .catch(() => {
                    // keep showing the last good numbers
                    if (!cancelled) setFailed(true)
                })
        const loadIfVisible = () => {
            if (document.visibilityState === "visible") load()
        }

        load()
        const id = setInterval(loadIfVisible, REFRESH_MS)
        document.addEventListener("visibilitychange", loadIfVisible)
        return () => {
            cancelled = true
            clearInterval(id)
            document.removeEventListener("visibilitychange", loadIfVisible)
        }
    }, [token])

    const loadFailed = failed && !overview

    return (
        <div className="flex flex-col gap-6 px-2 py-6 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <DashboardFormText text="Dashboard" className="text-[24px]" />
                    <p className="text-[13px] text-[#62666F]">Monitor your auctions, bids and overall performance.</p>
                </div>
                {canAccess("/dashboard/auctions/create-auctions") && (
                    <Link
                        href="/dashboard/auctions/create-auctions"
                        className={cn(
                            buttonVariants(),
                            "h-11 gap-2 rounded-[8px] bg-[#F5A000] px-5 text-black hover:bg-[#E09200]"
                        )}
                    >
                        <PlusIcon className="h-4 w-4" /> Create Auction
                    </Link>
                )}
            </div>

            <DashboardStats stats={overview?.stats ?? null} failed={loadFailed} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <AuctionCalendar />
                <UpcomingAuctions auctions={overview?.upcoming ?? null} failed={loadFailed} />
            </div>

            <LiveAuctionsTable auctions={overview?.live ?? null} failed={loadFailed} />

            <RecentBids bids={overview?.recentBids ?? null} failed={loadFailed} />

            {/* same people as the Bid History page */}
            {canAccess(BID_HISTORY_PATH) && <LotBidHistory />}

            <QuickActions />
        </div>
    )
}
