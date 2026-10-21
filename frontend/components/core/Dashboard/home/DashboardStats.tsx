import Link from "next/link"
import { Activity, CalendarDays, CircleCheck, Gavel, type LucideIcon } from "lucide-react"

import { useCanAccessPage } from "@/hooks/useCanAccessPage"
import type { AuctionStats } from "@/lib/types/auction.types"
import { cn } from "@/lib/utils"

const count = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString("en-IN"))

interface StatCardProps {
    title: string
    value: string
    note: string
    href: string
    icon: LucideIcon
    iconClassName: string
    noteClassName?: string
}

function StatCard({ title, value, note, href, icon: Icon, iconClassName, noteClassName }: StatCardProps) {
    const canAccess = useCanAccessPage()
    const content = (
        <>
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", iconClassName)}>
                <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
                <p className="text-[12px] text-[#62666F]">{title}</p>
                <p className="text-[24px] font-bold leading-tight text-slate-900">{value}</p>
                <p className={cn("truncate text-[11px] text-[#8A8D94]", noteClassName)}>{note}</p>
            </div>
        </>
    )
    const box = "flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4"

    // the number still shows; it only links when the role can open that list
    if (!canAccess(href)) return <div className={box}>{content}</div>

    return (
        <Link href={href} className={cn(box, "transition-shadow hover:shadow-md")}>
            {content}
        </Link>
    )
}

export function DashboardStats({ stats, failed }: { stats: AuctionStats | null; failed: boolean }) {
    // values show "—" until loaded (or if the request failed)
    const note = (text: string) => (stats ? text : failed ? "Couldn't load" : "Loading…")

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
                title="Total Auctions"
                value={count(stats?.total)}
                note={note(`${count(stats?.createdThisMonth)} created this month`)}
                href="/dashboard/auctions"
                icon={Gavel}
                iconClassName="bg-[#F6E9EF] text-[#7B2D52]"
            />
            <StatCard
                title="Live Auctions"
                value={count(stats?.live)}
                note={note(stats?.paused ? `${count(stats.paused)} paused` : "Currently accepting bids")}
                href="/dashboard/auctions/live-auctions"
                icon={Activity}
                iconClassName="bg-[#E8F7EE] text-[#1F8A4C]"
                noteClassName={stats ? "text-[#1F8A4C]" : undefined}
            />
            <StatCard
                title="Upcoming Auctions"
                value={count(stats?.upcoming)}
                note={note("Scheduled to start")}
                href="/dashboard/auctions/upcoming-auctions"
                icon={CalendarDays}
                iconClassName="bg-[#FCF1DC] text-[#C98300]"
            />
            <StatCard
                title="Completed Auctions"
                value={count(stats?.completed)}
                note={note("Successfully closed")}
                href="/dashboard/auctions/past-auctions"
                icon={CircleCheck}
                iconClassName="bg-slate-100 text-slate-500"
            />
        </div>
    )
}
