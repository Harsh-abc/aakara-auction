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
    /** a bid or proxy went through */
    onSaved?: () => void
}

// place a bid on a live lot, or leave a proxy (maximum) bid on an upcoming one — changeable until it opens
export function BidDialog({ auctionUuid, lot, kind, onKindChange, onClose, onSaved }: BidDialogProps) {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [standing, setStanding] = useState<MyLotStanding | null>(null)
    const [loadError, setLoadError] = useState<{ lotUuid: string; message: string } | null>(null)
    const [reload, setReload] = useState(0)
    // the maximum the bidder typed, for this lot and kind only
    const [typed, setTyped] = useState<{ key: string; value: string }>({ key: "", value: "" })
    // the bid option the bidder picked, for this lot only ("" = the next valid bid)
    const [picked, setPicked] = useState<{ key: string; amount: string }>({ key: "", amount: "" })
    // the amount waiting on the bidder's confirmation
    const [confirming, setConfirming] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    // the bid dialog's height, so the confirmation covers it exactly
    const [bidPanel, setBidPanel] = useState<HTMLDivElement | null>(null)
    const [bidPanelHeight, setBidPanelHeight] = useState<number | null>(null)

    useEffect(() => {
        if (!bidPanel) return
        const observer = new ResizeObserver(() => setBidPanelHeight(bidPanel.offsetHeight))
        observer.observe(bidPanel)
        return () => observer.disconnect()
    }, [bidPanel])

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
    // a new bid moves the options up; a pick that's no longer offered falls back to the next valid bid
    const options = kind === "bid" ? current?.bidOptions ?? [] : []
    const pickedAmount = picked.key === inputKey && options.includes(picked.amount) ? picked.amount : options[0] ?? ""
    const value = kind === "bid" ? pickedAmount : typed.key === inputKey ? typed.value : ""
    const amount = parseAmount(value)

    const count = Number(current?.bidCount ?? lot.bidCount) || 0
    const verified = current?.registration === "VERIFIED"
    const allowed = kind === "bid" ? current?.canBid : current?.canProxy
    const leadingOnBid = kind === "bid" && current?.leading
    // proxy bids close as soon as the lot opens (the page's live status can be ahead of the dialog's)
    const proxyOpen = UPCOMING_LOT_STATUSES.includes(lot.status) && (!current || UPCOMING_LOT_STATUSES.includes(current.status))
    // the bidder's proxy, changeable until the lot opens and locked after
    const proxyMax = kind === "proxy" ? current?.proxyMax ?? null : null
    const proxyLocked = Boolean(proxyMax) && !proxyOpen
    const sameAsProxy = proxyMax !== null && amount === Number(proxyMax)

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
    } else if (current && proxyLocked) {
        blocker = (
            <>
                Your maximum bid of <span className="font-medium text-neutral-950">{money(proxyMax)}</span> is set.{" "}
                {lotTag(lot)} has opened, so it can no longer be changed.
            </>
        )
    } else if (current && kind === "proxy" && !proxyOpen && current.status === "ACTIVE") {
        blocker = (
            <>
                {lotTag(lot)} is live — proxy bids close when a lot opens.{" "}
                {current.canBid && (
                    <button type="button" onClick={() => onKindChange("bid")} className="cursor-pointer text-neutral-950 underline underline-offset-2">
                        Place a bid instead
                    </button>
                )}
            </>
        )
    } else if (current && !allowed) {
        if (kind === "bid" && UPCOMING_LOT_STATUSES.includes(current.status)) {
            blocker = current.canProxy ? (
                current.proxyMax ? (
                    <>
                        {lotTag(lot)} isn&apos;t on the block yet. Your maximum bid of {money(current.proxyMax)} is placed for you when the auctioneer
                        calls the hammer.{" "}
                        <button type="button" onClick={() => onKindChange("proxy")} className="cursor-pointer text-neutral-950 underline underline-offset-2">
                            Change it
                        </button>{" "}
                        until the lot opens.
                    </>
                ) : (
                    <>
                        {lotTag(lot)} isn&apos;t on the block yet.{" "}
                        <button type="button" onClick={() => onKindChange("proxy")} className="cursor-pointer text-neutral-950 underline underline-offset-2">
                            Leave a proxy bid
                        </button>{" "}
                        and it&apos;s placed for you when the auctioneer calls the hammer.
                    </>
                )
            ) : current.proxyMax ? (
                `${lotTag(lot)} isn't on the block yet. Your maximum bid of ${money(current.proxyMax)} is placed for you when the auctioneer calls the hammer.`
            ) : (
                `${lotTag(lot)} isn't on the block yet. You can bid when it opens.`
            )
        } else if (kind === "bid" && current.status === "ACTIVE" && current.auctionStatus === "PAUSED") {
            blocker = "Bidding is paused. It resumes when the auctioneer restarts the sale."
        } else {
            blocker = `Bidding on ${lotTag(lot)} has closed.`
        }
    }

    const canPlace = Boolean(current && verified && allowed && !leadingOnBid && !submitting && (kind === "bid" || proxyOpen))
    const canSubmit = canPlace && amount > 0 && !sameAsProxy

    // someone bid while the bidder was confirming, and the amount no longer reaches the next bid
    const outpaced = kind === "bid" && confirming !== null && Number(current?.nextBid) > confirming

    const review = () => {
        if (canSubmit) setConfirming(amount)
    }

    const submit = async () => {
        if (!canPlace || confirming === null || outpaced) return
        setSubmitting(true)
        try {
            const { message, data } =
                kind === "bid" ? await placeBid(lot.uuid, confirming, token) : await setProxyBid(lot.uuid, confirming, token)
            // topped straight away by someone's proxy: say so, but it isn't an error
            if (data.leading || data.status !== "ACTIVE") toast.success(message)
            else toast(message, { icon: "⚠️" })
            setTyped({ key: "", value: "" })
            setPicked({ key: "", amount: "" })
            setConfirming(null)
            onSaved?.()
            onClose()
        } catch (err) {
            toast.error(getErrorMessage(err, "Your bid didn't go through. Please try again."))
            setConfirming(null)
            // someone may have bid first — show the new asking price
            setReload((n) => n + 1)
        } finally {
            setSubmitting(false)
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (!open && !submitting) onClose()
    }

    const handleConfirmOpenChange = (open: boolean) => {
        if (!open && !submitting) setConfirming(null)
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
            <DialogContent ref={setBidPanel} className="max-h-[90dvh] gap-0 overflow-y-auto rounded-none p-0 sm:max-w-md">
                <DialogHeader className="border-b border-neutral-200 p-6 pr-12">
                    <p className={cn(SMALL_CAPS, "text-neutral-500")}>{lotTag(lot)}</p>
                    <DialogTitle className="text-xl leading-snug font-light text-neutral-950">{lotHeading(lot)}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {kind === "bid" ? "Place a bid on this lot" : "Set the most you're willing to pay for this lot"}
                    </DialogDescription>

                    {/* bid now / proxy (proxy closes once the lot opens) */}
                    <div className="mt-4 grid grid-cols-2 border border-neutral-950" role="tablist">
                        {(["bid", "proxy"] as const).map((option) => {
                            const closed = option === "proxy" && !proxyOpen && kind !== "proxy"
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    role="tab"
                                    aria-selected={kind === option}
                                    onClick={() => onKindChange(option)}
                                    disabled={submitting || closed}
                                    title={closed ? "Proxy bids close when the lot opens" : undefined}
                                    className={cn(
                                        "h-9 cursor-pointer text-[11px] tracking-[0.18em] uppercase transition-colors disabled:cursor-not-allowed disabled:text-neutral-400",
                                        kind === option ? "bg-neutral-950 text-white" : "bg-white text-neutral-950 not-disabled:hover:bg-neutral-50"
                                    )}
                                >
                                    {option === "bid" ? "Place bid" : "Proxy bid"}
                                </button>
                            )
                        })}
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
                            <p className="mt-5 text-sm leading-relaxed text-neutral-600">You&apos;re the highest bidder.</p>
                        ) : kind === "bid" ? (
                            <div className="mt-5">
                                <p id="bid-options-label" className={cn(SMALL_CAPS, "text-neutral-500")}>
                                    Choose your bid
                                </p>
                                <div role="radiogroup" aria-labelledby="bid-options-label" className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    {options.map((option) => {
                                        const selected = option === pickedAmount
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                onClick={() => setPicked({ key: inputKey, amount: option })}
                                                disabled={submitting}
                                                className={cn(
                                                    "h-12 cursor-pointer border px-2 text-sm font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                                    selected
                                                        ? "border-neutral-950 bg-neutral-950 text-white"
                                                        : "border-neutral-300 bg-white text-neutral-950 not-disabled:hover:border-neutral-950"
                                                )}
                                            >
                                                {money(option)}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                                    Bids follow the auction&apos;s increments. Bids are binding and can&apos;t be withdrawn.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5">
                                <label htmlFor="bid-amount" className={cn(SMALL_CAPS, "text-neutral-500")}>
                                    {proxyMax ? "Your new maximum bid" : "Your maximum bid"}
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
                                            if (event.key === "Enter") review()
                                        }}
                                        placeholder={current.nextBid ? `${Number(current.nextBid)} or more` : ""}
                                        disabled={submitting}
                                        className="h-full w-full bg-transparent px-2 text-base text-neutral-950 outline-none placeholder:text-neutral-400"
                                    />
                                </div>
                                {sameAsProxy && <p className="mt-2 text-xs text-red-600">That&apos;s already your maximum bid.</p>}
                                <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                                    When the auctioneer calls the hammer, your maximum is placed for you: if it&apos;s the highest, you win at one
                                    increment above the standing bid — never above your maximum. The highest maximum always wins; if two bidders leave the same maximum, the one
                                    who set it first wins (a changed maximum counts from when it was changed). Other bidders don&apos;t see it. You
                                    can change it until the lot opens; after that it&apos;s locked.
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
                        className={cn(ACTION, "border border-neutral-950 bg-white text-neutral-950 not-disabled:hover:bg-neutral-50")}
                    >
                        Cancel
                    </button>
                    <button type="button" onClick={review} disabled={!canSubmit} className={cn(ACTION, "bg-neutral-950 text-white not-disabled:hover:bg-neutral-800")}>
                        {kind === "bid"
                            ? amount > 0
                                ? `Bid ${money(amount)}`
                                : "Place bid"
                            : amount > 0
                              ? `${proxyMax ? "Update" : "Set"} maximum ${money(amount)}`
                              : proxyMax
                                ? "Update maximum"
                                : "Set maximum"}
                    </button>
                </div>

                {/* last look before the bid is sent */}
                <Dialog open={confirming !== null} onOpenChange={handleConfirmOpenChange}>
                    {/* same size as the bid dialog behind it, so it sits squarely on top; the buttons stay at the bottom */}
                    <DialogContent
                        showCloseButton={false}
                        style={bidPanelHeight ? { height: bidPanelHeight } : undefined}
                        className="flex max-h-[90dvh] flex-col gap-0 overflow-y-auto rounded-none p-0 sm:max-w-md"
                    >
                        <DialogHeader className="border-b border-neutral-200 p-6">
                            <p className={cn(SMALL_CAPS, "text-neutral-500")}>{lotTag(lot)}</p>
                            <DialogTitle className="text-xl leading-snug font-light text-neutral-950">
                                {kind === "bid" ? "Confirm your bid" : "Confirm your maximum bid"}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-neutral-600">{lotHeading(lot)}</DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 p-6">
                            <p className={cn(SMALL_CAPS, "text-neutral-500")}>{kind === "bid" ? "Your bid" : "Your maximum bid"}</p>
                            <p className="mt-2 text-3xl font-light tabular-nums text-neutral-950">{money(confirming)}</p>
                            <p className={cn("mt-4 text-xs leading-relaxed", outpaced ? "text-red-600" : "text-neutral-500")}>
                                {outpaced
                                    ? `Another bidder got there first — the next bid is now ${money(current?.nextBid ?? null)}. Go back and choose again.`
                                    : kind === "bid"
                                      ? "By confirming you agree to buy this lot at this price if yours is the winning bid. Bids are binding and can't be withdrawn."
                                      : `We'll bid for you up to this amount when the auctioneer calls the hammer. If it wins, you agree to buy this lot at the winning price.${proxyMax ? ` It replaces your current maximum of ${money(proxyMax)}.` : ""} You can change it until the lot opens; after that it can't be changed or withdrawn.`}
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 p-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => handleConfirmOpenChange(false)}
                                disabled={submitting}
                                className={cn(ACTION, "border border-neutral-950 bg-white text-neutral-950 not-disabled:hover:bg-neutral-50")}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={submit}
                                disabled={submitting || !canPlace || outpaced}
                                className={cn(ACTION, "bg-neutral-950 text-white not-disabled:hover:bg-neutral-800")}
                            >
                                {submitting ? "Sending..." : kind === "bid" ? "Confirm bid" : "Confirm maximum"}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    )
}
