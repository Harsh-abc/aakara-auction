"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ImageOff } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useAppSelector } from "@/hooks/redux"
import { cn } from "@/lib/utils"
import { getMyWinnings } from "@/services/operations/profile.api"
import type { WinnerPaymentStatus, WonLot } from "@/lib/types/profile.types"

import { BUTTON, BUTTON_SOLID, EYEBROW } from "../storefront"
import { formatMoney, lotDetails, lotDetailsHref, lotHeading, lotNumber } from "../auctions/detail/lotDisplay"

const PAYMENT_LABELS: Record<WinnerPaymentStatus, { label: string; className: string }> = {
    PENDING: { label: "Payment due", className: "border-[#d0a55d] bg-[#fdedd6] text-[#0d0d0d]" },
    PAID: { label: "Paid", className: "border-[#0d0d0d] bg-[#0d0d0d] text-white" },
    OVERDUE: { label: "Overdue", className: "border-[#b42318] bg-[#fef3f2] text-[#b42318]" },
    REFUNDED: { label: "Refunded", className: "border-[#cecece] bg-white text-[#717171]" },
    CANCELLED: { label: "Cancelled", className: "border-[#cecece] bg-white text-[#717171]" },
}

const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value))

/** "My winnings" tab: lots the user won, with the hammer price, premium and total due. `empty` shows when there are none. */
export function MyWinnings({ empty }: { empty: React.ReactNode }) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const [items, setItems] = useState<WonLot[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getMyWinnings(token)
            .then((data) => !cancelled && setItems(data))
            .catch(() => !cancelled && setError("We couldn't load your winnings."))
        return () => {
            cancelled = true
        }
    }, [token])

    if (error && !items) return <p className="py-6 text-center text-[14px] leading-[22.75px] text-[#717171]">{error}</p>

    if (!items) {
        return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="aspect-[3/4] w-full rounded-none" />
                ))}
            </div>
        )
    }

    if (items.length === 0) return <>{empty}</>

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((win) => (
                <WonLotCard key={win.lot.uuid} win={win} />
            ))}
        </div>
    )
}

function WonLotCard({ win }: { win: WonLot }) {
    const { lot, auction, currency } = win
    const details = lotDetails(lot)
    const payment = PAYMENT_LABELS[win.paymentStatus] ?? PAYMENT_LABELS.PENDING
    const hasPremium = Number(win.buyerPremiumAmount) > 0

    return (
        <article className="flex flex-col border border-[#cecece] bg-white p-4">
            <div className="flex h-62.75 items-center justify-center overflow-hidden bg-white">
                {lot.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lot.image} alt={lotHeading(lot)} className="h-full w-full object-contain" loading="lazy" />
                ) : (
                    <ImageOff className="size-6 text-[#cecece]" />
                )}
            </div>

            <div className="mt-4 flex min-h-5 items-center justify-between gap-2">
                <span className="text-[10px] leading-3.75 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">
                    {lotNumber(lot)}
                </span>
                <span
                    className={cn(
                        "border px-2 py-0.5 text-[10px] leading-3.75 tracking-[0.12em] uppercase",
                        payment.className
                    )}
                >
                    {payment.label}
                </span>
            </div>

            <div className="mt-4 flex-1">
                <h3 className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{lotHeading(lot)}</h3>
                {details && <p className={cn(EYEBROW, "mt-1")}>{details}</p>}
                <Link
                    href={`/auctions/${auction.uuid}`}
                    className="mt-2 block text-[12px] leading-[19.5px] text-[#717171] hover:text-[#0d0d0d] hover:underline"
                >
                    {auction.title}
                </Link>

                <dl className="mt-4 flex flex-col gap-1 border-t border-[#cecece] pt-3.25 text-[12px] leading-5">
                    <Row label="Won on" value={formatDate(win.wonAt)} />
                    <Row label="Hammer price" value={formatMoney(win.finalHammerPrice, currency)} />
                    {hasPremium && <Row label="Buyer's premium" value={formatMoney(win.buyerPremiumAmount, currency)} />}
                    <Row label="Total due" value={formatMoney(win.totalAmountDue, currency)} strong />
                    {win.paymentDueAt && win.paymentStatus === "PENDING" && (
                        <Row label="Pay by" value={formatDate(win.paymentDueAt)} />
                    )}
                </dl>
            </div>

            <Link href={lotDetailsHref(auction.uuid, lot)} className={cn(BUTTON, BUTTON_SOLID, "mt-4 w-full")}>
                View lot
            </Link>
        </article>
    )
}

function Row({ label, value, strong }: { label: string; value: string | null; strong?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[#717171]">{label}</dt>
            <dd className={cn("text-right text-[#0d0d0d]", strong && "text-[14px] font-medium")}>{value ?? "—"}</dd>
        </div>
    )
}
