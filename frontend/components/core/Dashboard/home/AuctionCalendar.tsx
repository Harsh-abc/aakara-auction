"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import { useAppSelector } from "@/hooks/redux"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { AuctionStatus, DashboardCalendarAuction } from "@/lib/types/auction.types"
import { cn } from "@/lib/utils"
import { getDashboardCalendar } from "@/services/operations/auction.api"

import { dayKey, StatusPill } from "./dashboardUi"

type DayKind = "live" | "upcoming" | "past"

const KIND_OF: Partial<Record<AuctionStatus, DayKind>> = {
    LIVE: "live",
    PAUSED: "live",
    SCHEDULED: "upcoming",
    PREVIEW: "upcoming",
    ENDED: "past",
    SETTLED: "past",
}

// a day with several sales shows the most pressing one
const KIND_RANK: Record<DayKind, number> = { live: 3, upcoming: 2, past: 1 }

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_SPAN_DAYS = 62

const monthLabel = (year: number, month: number) =>
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(Date.UTC(year, month, 1))
    )

/** Day keys (YYYY-MM-DD) are handled as UTC midnights so stepping a day is exact */
const keyToUtc = (key: string) => Date.parse(`${key}T00:00:00Z`)
const utcToKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)

interface DayInfo {
    kind: DayKind
    auctions: DashboardCalendarAuction[]
}

export function AuctionCalendar() {
    const token = useAppSelector((state) => state.auth.accessToken)

    const todayKey = dayKey(new Date())
    const [view, setView] = useState(() => {
        const [y, m] = todayKey.split("-").map(Number)
        return { year: y, month: m - 1 }
    })
    const [selected, setSelected] = useState<string | null>(todayKey)

    const monthParam = `${view.year}-${String(view.month + 1).padStart(2, "0")}`

    // the last month answered (or failed); while it differs from the shown month, that month is loading
    const [result, setResult] = useState<{ month: string; auctions: DashboardCalendarAuction[] | null } | null>(null)
    const loading = result?.month !== monthParam
    const failed = !loading && result?.auctions === null

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getDashboardCalendar(token, monthParam)
            .then((data) => {
                if (!cancelled) setResult({ month: monthParam, auctions: data.auctions })
            })
            .catch(() => {
                if (!cancelled) setResult({ month: monthParam, auctions: null })
            })
        return () => {
            cancelled = true
        }
    }, [token, monthParam])

    const auctions = useMemo(() => (loading ? [] : result?.auctions ?? []), [loading, result])

    // every day a sale runs on, marked with its most pressing kind
    const days = useMemo(() => {
        const map = new Map<string, DayInfo>()
        for (const auction of auctions) {
            const kind = KIND_OF[auction.status]
            if (!kind) continue
            const first = keyToUtc(dayKey(new Date(auction.startTime)))
            const last = Math.min(keyToUtc(dayKey(new Date(auction.endTime))), first + MAX_SPAN_DAYS * DAY_MS)
            for (let ms = first; ms <= last; ms += DAY_MS) {
                const key = utcToKey(ms)
                const info = map.get(key)
                if (!info) map.set(key, { kind, auctions: [auction] })
                else {
                    info.auctions.push(auction)
                    if (KIND_RANK[kind] > KIND_RANK[info.kind]) info.kind = kind
                }
            }
        }
        return map
    }, [auctions])

    // 6 weeks, Sunday first, including the neighbouring months' days
    const cells = useMemo(() => {
        const firstOfMonth = Date.UTC(view.year, view.month, 1)
        const start = firstOfMonth - new Date(firstOfMonth).getUTCDay() * DAY_MS
        return Array.from({ length: 42 }, (_, i) => {
            const ms = start + i * DAY_MS
            return { key: utcToKey(ms), day: new Date(ms).getUTCDate(), inMonth: new Date(ms).getUTCMonth() === view.month }
        })
    }, [view])

    const step = (delta: number) => {
        setView(({ year, month }) => {
            const next = new Date(Date.UTC(year, month + delta, 1))
            return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
        })
        setSelected(null)
    }

    const selectedDay = selected ? days.get(selected) : undefined

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => step(-1)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Previous month"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="flex items-center gap-2 text-[14px] font-bold text-slate-900">
                    {monthLabel(view.year, view.month)}
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                </p>
                <button
                    type="button"
                    onClick={() => step(1)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Next month"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="mb-3 flex items-center gap-3 text-[10px] text-[#62666F]">
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-300" /> Past
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#7B2D52]" /> Live
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full border border-[#7B2D52]" /> Upcoming
                </span>
                {failed && <span className="ml-auto text-[#C93B3B]">Couldn&apos;t load</span>}
            </div>

            <div className="grid grid-cols-7 gap-y-1.5 text-center">
                {WEEKDAYS.map((d) => (
                    <span key={d} className="pb-1 text-[11px] font-medium text-[#8A8D94]">
                        {d}
                    </span>
                ))}

                {cells.map(({ key, day, inMonth }) => {
                    const info = inMonth ? days.get(key) : undefined
                    const isToday = key === todayKey
                    return (
                        <div key={key} className="flex justify-center">
                            <button
                                type="button"
                                disabled={!info}
                                onClick={() => setSelected(key)}
                                title={info?.auctions.map((a) => a.title).join("\n")}
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-md text-[12px] transition-colors",
                                    inMonth ? "text-slate-700" : "text-slate-300",
                                    isToday && !info && "font-bold text-[#7B2D52]",
                                    info && "cursor-pointer font-semibold",
                                    info?.kind === "live" && "bg-[#7B2D52] text-white hover:bg-[#65233F]",
                                    info?.kind === "upcoming" && "border border-[#7B2D52] text-[#7B2D52] hover:bg-[#F6E9EF]",
                                    info?.kind === "past" && "bg-slate-200 text-slate-700 hover:bg-slate-300",
                                    selected === key && info && "ring-2 ring-[#F5A000] ring-offset-1"
                                )}
                            >
                                {day}
                            </button>
                        </div>
                    )
                })}
            </div>

            {selectedDay && (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {selectedDay.auctions.map((auction) => (
                        <li key={auction.uuid} className="flex items-center justify-between gap-2">
                            <Link
                                href={`/dashboard/auctions/${auction.uuid}`}
                                className="truncate text-[12px] font-medium text-slate-800 hover:underline"
                            >
                                {auction.title}
                            </Link>
                            <StatusPill tone={KIND_OF[auction.status] === "live" ? "green" : KIND_OF[auction.status] === "upcoming" ? "amber" : "slate"}>
                                {AUCTION_STATUS_LABELS[auction.status]}
                            </StatusPill>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
