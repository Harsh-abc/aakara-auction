"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import toast from "react-hot-toast"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import type { MyLotStanding } from "@/lib/types/bidding.types"
import type { PublicLot } from "@/lib/types/publicAuction.types"
import { cn } from "@/lib/utils"
import { getMyLotStanding, placeBid, setProxyBid } from "@/services/operations/bidding.api"

import { auctionHref } from "../auctionDisplay"
import { formatMoney, lotHeading } from "../detail/lotDisplay"
import { bidCountLabel, lotTag, UPCOMING_LOT_STATUSES } from "./lotPageDisplay"
import type { BidKind } from "./useBidAction"

const SMALL_CAPS = "text-[10px] uppercase tracking-[0.18em]"
const ACTION =
    "inline-flex h-11 cursor-pointer items-center justify-center px-6 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-50"

// "1,50,000" / "150000.5" → 150000.5; anything else → NaN
const parseAmount = (value: string) => (value.trim() ? Number(value.replace(/[,\s]/g, "")) : NaN)

type BidDialogProps = {
    auctionUuid: string
    /** the lot as the page has it — a new bid on it refreshes the dialog's numbers */
    lot: PublicLot | null
    kind: BidKind
    onKindChange: (kind: BidKind) => void
    onClose: () => void
}

// place a bid on a live lot, or set / raise a proxy (maximum) bid on a live or upcoming one
export function BidDialog({ auctionUuid, lot, kind, onKindChange, onClose }: BidDialogProps) {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [standing, setStanding] = useState<MyLotStanding | null>(null)
    const [loadError, setLoadError] = useState<{ lotUuid: string; message: string } | null>(null)
    const [reload, setReload] = useState(0)
    // what the bidder typed, for this lot and kind only ("" = use the suggestion)
    const [typed, setTyped] = useState<{ key: string; value: string }>({ key: "", value: "" })
    const [submitting, setSubmitting] = useState(false)

    const lotUuid = lot?.uuid
    const bidCount = lot?.bidCount
    const lotStatus = lot?.status

    useEffect(() => {
        if (!lotUuid) return
        let cancelled = false
        getMyLotStanding(lotUuid, token)
            .then((data) => {
                if (cancelled) return
                setStanding(data)
                setLoadError(null)
            })
            .catch((err) => {
                if (!cancelled) setLoadError({ lotUuid, message: getErrorMessage(err) })
            })
        return () => {
            cancelled = true
        }
    }, [lotUuid, bidCount, lotStatus, token, reload])

    if (!lot) return null

    const current = standing?.lotUuid === lot.uuid ? standing : null
    const error = !current && loadError?.lotUuid === lot.uuid ? loadError.message : null
    const money = (amount: string | number | null) => formatMoney(amount, current?.currency ?? lot.currency) ?? "—"

    const inputKey = `${lot.uuid}:${kind}`
    const suggested = kind === "bid" ? current?.nextBid ?? "" : ""
    const value = typed.key === inputKey ? typed.value : suggested
    const amount = parseAmount(value)

    const count = Number(current?.bidCount ?? lot.bidCount) || 0
    const verified = current?.registration === "VERIFIED"
    const allowed = kind === "bid" ? current?.canBid : current?.canProxy
    const leadingOnBid = kind === "bid" && current?.leading

    // why this kind of bid can't be placed right now (null = it can)
    let blocker: ReactNode = null
    if (current && current.registration === "NOT_REGISTERED") {
        blocker = (
            <>
                Register for this sale to bid on its lots.{" "}
                <Link href={auctionHref({ uuid: auctionUuid })} onClick={onClose} className="text-neutral-950 underline underline-offset-2">
                    Register to bid
                </Link>
            </>
        )
    } else if (current && current.registration === "PENDING") {
        blocker = "Your registration is awaiting verification by the auction house. You can bid once it's approved."
    } else if (current && !allowed) {
        if (kind === "bid" && UPCOMING_LOT_STATUSES.includes(current.status) && current.canProxy) {
            blocker = (
                <>
                    {lotTag(lot)} isn&apos;t on the block yet.{" "}
                    <button type="button" onClick={() => onKindChange("proxy")} className="cursor-pointer text-neutral-950 underline underline-offset-2">
                        Leave a proxy bid
                    </button>{" "}
                    and it bids for you when the lot opens.
                </>
            )
        } else if (kind === "bid" && current.status === "ACTIVE" && current.auctionStatus === "PAUSED") {
            blocker = "Bidding is paused. It resumes when the auctioneer restarts the sale."
        } else {
            blocker = `Bidding on ${lotTag(lot)} has closed.`
        }
    }

    const canSubmit = Boolean(current && verified && allowed && !leadingOnBid && amount > 0 && !submitting)

    const submit = async () => {
        if (!canSubmit) return
        setSubmitting(true)
        try {
            const { message, data } =
                kind === "bid" ? await placeBid(lot.uuid, amount, token) : await setProxyBid(lot.uuid, amount, token)
            // topped straight away by someone's proxy: say so, but it isn't an error
            if (data.leading || data.status !== "ACTIVE") toast.success(message)
            else toast(message, { icon: "⚠️" })
            setTyped({ key: "", value: "" })
            onClose()
        } catch (err) {
            toast.error(getErrorMessage(err, "Your bid didn't go through. Please try again."))
            // someone may have bid first — show the new asking price
            setReload((n) => n + 1)
        } finally {
            setSubmitting(false)
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (!open && !submitting) onClose()
    }

    const rows = current
        ? [
              { term: count > 0 ? `Current bid · ${bidCountLabel(count)}` : "Starting bid", value: money(count > 0 ? current.currentBid : lot.startingPrice) },
              current.nextBid ? { term: "Next valid bid", value: money(current.nextBid) } : null,
              current.paddleNumber ? { term: "Your paddle", value: current.paddleNumber } : null,
              count > 0 && verified ? { term: "Your position", value: current.leading ? "Highest bidder" : "Not leading" } : null,
              current.proxyMax ? { term: "Your maximum bid", value: money(current.proxyMax) } : null,
          ].filter((row): row is { term: string; value: string } => row !== null)
        : []

    return (
        <Dialog open onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-none p-0 sm:max-w-md">
                <DialogHeader className="border-b border-neutral-200 p-6 pr-12">
                    <p className={cn(SMALL_CAPS, "text-neutral-500")}>{lotTag(lot)}</p>
                    <DialogTitle className="text-xl leading-snug font-light text-neutral-950">{lotHeading(lot)}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {kind === "bid" ? "Place a bid on this lot" : "Set the most you're willing to pay for this lot"}
                    </DialogDescription>

                    {/* bid now / proxy */}
                    <div className="mt-4 grid grid-cols-2 border border-neutral-950" role="tablist">
                        {(["bid", "proxy"] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                role="tab"
                                aria-selected={kind === option}
                                onClick={() => onKindChange(option)}
                                disabled={submitting}
                                className={cn(
                                    "h-9 cursor-pointer text-[11px] tracking-[0.18em] uppercase transition-colors",
                                    kind === option ? "bg-neutral-950 text-white" : "bg-white text-neutral-950 hover:bg-neutral-50"
                                )}
                            >
                                {option === "bid" ? "Place a bid" : "Proxy bid"}
                            </button>
                        ))}
                    </div>
                </DialogHeader>

                {error ? (
                    <p className="p-6 text-sm text-red-600">{error}</p>
                ) : !current ? (
                    <div className="space-y-3 p-6">
                        <Skeleton className="h-10 w-full rounded-none" />
                        <Skeleton className="h-10 w-full rounded-none" />
                        <Skeleton className="h-11 w-full rounded-none" />
                    </div>
                ) : (
                    <div className="p-6">
                        <dl className="divide-y divide-neutral-200 border-y border-neutral-200">
                            {rows.map(({ term, value: rowValue }) => (
                                <div key={term} className="flex min-h-10 items-center justify-between gap-4 py-2">
                                    <dt className={cn(SMALL_CAPS, "text-neutral-500")}>{term}</dt>
                                    <dd className="text-right text-sm font-medium text-neutral-950">{rowValue}</dd>
                                </div>
                            ))}
                        </dl>

                        {blocker ? (
                            <p className="mt-5 text-sm leading-relaxed text-neutral-600">{blocker}</p>
                        ) : leadingOnBid ? (
                            <p className="mt-5 text-sm leading-relaxed text-neutral-600">
                                You&apos;re the highest bidder.{" "}
                                {current.canProxy && (
                                    <>
                                        To stay ahead without watching,{" "}
                                        <button
                                            type="button"
                                            onClick={() => onKindChange("proxy")}
                                            className="cursor-pointer text-neutral-950 underline underline-offset-2"
                                        >
                                            set a maximum bid
                                        </button>
                                        .
                                    </>
                                )}
                            </p>
                        ) : (
                            <div className="mt-5">
                                <label htmlFor="bid-amount" className={cn(SMALL_CAPS, "text-neutral-500")}>
                                    {kind === "bid" ? "Your bid" : current.proxyMax ? "Raise your maximum to" : "Your maximum bid"}
                                </label>
                                <div className="mt-2 flex h-12 items-center border border-neutral-300 bg-white focus-within:border-neutral-950">
                                    <span className="pl-3 text-sm text-neutral-500">{current.currency.symbol ?? current.currency.code}</span>
                                    <input
                                        id="bid-amount"
                                        inputMode="decimal"
                                        autoComplete="off"
                                        value={value}
                                        onChange={(event) => setTyped({ key: inputKey, value: event.target.value })}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") submit()
                                        }}
                                        placeholder={current.nextBid ? `${Number(current.nextBid)} or more` : ""}
                                        disabled={submitting}
                                        className="h-full w-full bg-transparent px-2 text-base text-neutral-950 outline-none placeholder:text-neutral-400"
                                    />
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                                    {kind === "bid"
                                        ? `Minimum ${money(current.nextBid)}. Bids are binding and can't be withdrawn.`
                                        : "We bid for you, one increment at a time, only as far as needed to keep you in the lead — never above your maximum. Other bidders don't see it."}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 p-6 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        disabled={submitting}
                        className={cn(ACTION, "border border-neutral-950 bg-white text-neutral-950 hover:bg-neutral-50")}
                    >
                        Cancel
                    </button>
                    <button type="button" onClick={submit} disabled={!canSubmit} className={cn(ACTION, "bg-neutral-950 text-white hover:bg-neutral-800")}>
                        {submitting
                            ? "Sending..."
                            : kind === "bid"
                              ? amount > 0
                                  ? `Bid ${money(amount)}`
                                  : "Place bid"
                              : amount > 0
                                ? `Set maximum ${money(amount)}`
                                : "Set maximum"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
