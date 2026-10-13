import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { formatMoney } from "@/lib/types/LotRow"
import { cn } from "@/lib/utils"

// auction house dates are shown in India time across the dashboard
export const DASHBOARD_TIME_ZONE = "Asia/Kolkata"

const startFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: DASHBOARD_TIME_ZONE,
})

/** "Oct 28, 2026 · 04:00 PM" */
export const formatStart = (iso: string) => startFmt.format(new Date(iso)).replace(/, (\d{1,2}:)/, " · $1")

export const money = (value: number | string | null, currency = "INR") =>
    formatMoney(value === null || value === "" ? null : Number(value), currency)

/** YYYY-MM-DD of an instant, in the dashboard time zone */
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DASHBOARD_TIME_ZONE,
})
export const dayKey = (date: Date) => dayKeyFmt.format(date)

// ---------------------------------------------------------------------

type PillTone = "green" | "amber" | "red" | "slate" | "maroon"

const PILL_TONES: Record<PillTone, string> = {
    green: "bg-[#E8F7EE] text-[#1F8A4C]",
    amber: "bg-[#FCF1DC] text-[#8A5B00]",
    red: "bg-[#FDECEC] text-[#C93B3B]",
    slate: "bg-slate-100 text-slate-600",
    maroon: "bg-[#F6E9EF] text-[#7B2D52]",
}

export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
    return (
        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold", PILL_TONES[tone])}>
            {children}
        </span>
    )
}

// ---------------------------------------------------------------------

interface PanelProps {
    title: string
    description?: string
    action?: { label: string; href: string }
    className?: string
    children: React.ReactNode
}

/** Grey section with a heading, an optional "View all" link, and white content inside */
export function Panel({ title, description, action, className, children }: PanelProps) {
    return (
        <section className={cn("rounded-xl bg-[#F6F6F7] p-4 md:p-5", className)}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
                    {description && <p className="mt-0.5 text-[11px] text-[#62666F]">{description}</p>}
                </div>
                {action && (
                    <Link
                        href={action.href}
                        className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#7B2D52] hover:underline"
                    >
                        {action.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                )}
            </div>
            {children}
        </section>
    )
}

export function PanelMessage({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-24 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-[13px] text-[#62666F]">
            {children}
        </div>
    )
}
