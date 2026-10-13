"use client"

import { useEffect, useState } from "react"

import { StatsCard } from "@/components/common/StatsCard"
import { useAppSelector } from "@/hooks/redux"
import type { UserStats as UserStatsData } from "@/lib/types/user.types"
import { getUserStats } from "@/services/operations/user.api"

const count = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString("en-IN"))

export default function UserStats() {
    const token = useAppSelector((state) => state.auth.accessToken)
    // refetch whenever the users list reloads (a user added, suspended, made a bidder…)
    const users = useAppSelector((state) => state.user.users)

    const [stats, setStats] = useState<UserStatsData | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getUserStats(token)
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
    }, [token, users])

    // values show "—" until loaded (or if the request failed)
    const s = stats
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
                title="Total Users"
                value={count(s?.total)}
                description={note(`+${count(s?.joinedThisMonth)} this month`)}
                image={"/admin/statscard05.png"}
                imageClassName="text-slate-600"
                href={'/dashboard/users/all-users'}
            />

            <StatsCard
                title="Bidders"
                value={count(s?.bidders)}
                description={note(`${count(s?.biddersCanBid)} with verified KYC`)}
                image={"/admin/statscard06.png"}
                imageClassName="text-emerald-500"
                href={'/dashboard/bidders'}
            />

            <StatsCard
                title="New Users"
                value={count(s?.newUsers)}
                description={note(`Joined in the last ${s?.newUserDays ?? 10} days`)}
                image={"/admin/statscard07.png"}
                imageClassName="text-orange-500"
                href={'/dashboard/users/new-users'}
            />

            <StatsCard
                title="Suspended"
                value={count(s?.suspended)}
                description={note("Blocked from bidding")}
                image={"/admin/statscard08.png"}
                imageClassName="text-slate-600"
                href={'/dashboard/users/suspended'}
            />

        </div>
    )
}
