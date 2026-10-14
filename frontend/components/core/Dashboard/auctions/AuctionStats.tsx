"use client"

import { useEffect, useState } from "react"

import { StatsCard } from "@/components/common/StatsCard"
import { useAppSelector } from "@/hooks/redux"
import type { AuctionStats as AuctionStatsData } from "@/lib/types/auction.types"
import { getAuctionStats } from "@/services/operations/auction.api"

const count = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString("en-IN"))

const startFmt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
})

export function AuctionStats() {
    const token = useAppSelector((state) => state.auth.accessToken)
    // on the auctions page, refetch whenever the list reloads (created, deleted, status changed…)
    const auctions = useAppSelector((state) => state.auction.auctions)

    const [stats, setStats] = useState<AuctionStatsData | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getAuctionStats(token)
            .then((data) => {
                if (cancelled) return
                setStats(data)
                setFailed(false)
            })
            .catch(() => {
                if (!cancelled) setFailed(true)
            })
        return () => {
            cancelled = true
        }
    }, [token, auctions])

    // values show "—" until loaded (or if the request failed)
    const note = (text: string) => (stats ? text : failed ? "Couldn't load" : "Loading…")

    return (
        <div
            className="
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-4
        py-6
      "
        >

            <StatsCard
                title="Auctions"
                value={count(stats?.total)}
                description={note(`+${count(stats?.createdThisMonth)} this month`)}
                image={"/admin/statscard01.png"}
                imageClassName="text-slate-600"
                href="/dashboard/auctions"
            />
            <StatsCard
                title="Live Auctions"
                value={count(stats?.live)}
                description={note(stats?.paused ? `${count(stats.paused)} paused` : "Active bidding")}
                image={"/admin/statscard02.png"}
                imageClassName="text-emerald-500"
                href="/dashboard/auctions/live-auctions"
            />

            <StatsCard
                title="Scheduled"
                value={count(stats?.upcoming)}
                description={note(
                    stats?.nextStartTime ? `Next: ${startFmt.format(new Date(stats.nextStartTime))}` : "None starting soon"
                )}
                image={"/admin/statscard03.png"}
                imageClassName="text-orange-500"
                href="/dashboard/auctions/upcoming-auctions"
            />

            <StatsCard
                title="Completed"
                value={count(stats?.completed)}
                description={note(`${count(stats?.settled)} settled`)}
                image={"/admin/statscard04.png"}
                imageClassName="text-slate-600"
                href="/dashboard/auctions/past-auctions"
            />

        </div>
    )
}
