"use client"

import { useEffect, useState, type FormEvent } from "react"
import toast from "react-hot-toast"
import { Bot, Check, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { LotProxyBidder, ProxyBidRow, StaffProxyAuction } from "@/lib/types/proxyBid.types"
import { cn } from "@/lib/utils"
import { getLotProxyBidders, getStaffProxyOptions, setProxyBidForBidder } from "@/services/operations/proxyBid.api"

import { money } from "../home/dashboardUi"

interface ProxyBidDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    token: string | null
    /** the proxy being changed; null to add one for any registered bidder */
    editing: ProxyBidRow | null
    /** after a save — reload the list */
    onSaved: () => void
}

const startDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })

// A super admin adds or changes a bidder's proxy (maximum) bid on a lot, until the auction goes live.
// The bidder must be verified on the lot; the bidder is emailed / texted the confirmation as usual.
export function ProxyBidDialog({ open, onOpenChange, token, editing, onSaved }: ProxyBidDialogProps) {
    const [auctions, setAuctions] = useState<StaffProxyAuction[] | null>(null)
    const [optionsError, setOptionsError] = useState<string | null>(null)
    const [auctionUuid, setAuctionUuid] = useState("")
    const [lotUuid, setLotUuid] = useState("")
    const [bidders, setBidders] = useState<{ lotUuid: string; list: LotProxyBidder[] | null; error: string | null } | null>(null)
    const [bidderUuid, setBidderUuid] = useState("")
    const [query, setQuery] = useState("")
    const [amount, setAmount] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // fresh form each time it opens
    const [wasOpen, setWasOpen] = useState(open)
    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setAuctionUuid("")
            setLotUuid("")
            setBidderUuid("")
            setQuery("")
            setAmount(editing ? editing.maxAmount : "")
            setError(null)
            setBidders(null)
            setOptionsError(null)
        }
    }

    const adding = !editing

    // auctions and lots staff can still set proxies on
    useEffect(() => {
        if (!open || !adding) return
        let cancelled = false
        getStaffProxyOptions(token)
            .then((list) => !cancelled && setAuctions(list))
            .catch((err) => !cancelled && setOptionsError(getErrorMessage(err, "Could not load the auctions")))
        return () => {
            cancelled = true
        }
    }, [open, adding, token])

    // the picked lot's verified bidders
    useEffect(() => {
        if (!open || !adding || !lotUuid) return
        let cancelled = false
        getLotProxyBidders(lotUuid, token)
            .then((list) => !cancelled && setBidders({ lotUuid, list, error: null }))
            .catch((err) => !cancelled && setBidders({ lotUuid, list: null, error: getErrorMessage(err, "Could not load the bidders") }))
        return () => {
            cancelled = true
        }
    }, [open, adding, lotUuid, token])

    const auction = auctions?.find((a) => a.uuid === auctionUuid) ?? null
    const lot = auction?.lots.find((l) => l.uuid === lotUuid) ?? null
    const lotBidders = bidders?.lotUuid === lotUuid ? bidders : null
    const bidder = lotBidders?.list?.find((b) => b.uuid === bidderUuid) ?? null

    // what the form is about, in either mode
    const currency = editing ? editing.currency.code : lot?.currencyCode ?? "INR"
    const minimum = editing ? editing.lot.startingPrice : lot?.startingPrice ?? null
    const currentMax = editing ? editing.maxAmount : bidder?.proxyMax ?? null

    const q = query.trim().replace(/^#/, "").toLowerCase()
    const shownBidders = (lotBidders?.list ?? []).filter(
        (b) =>
            !q ||
            b.paddle?.toLowerCase().startsWith(q) ||
            b.name?.toLowerCase().includes(q) ||
            b.username.toLowerCase().includes(q) ||
            b.email.toLowerCase().includes(q)
    )

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        const targetLot = editing ? editing.lot.uuid : lotUuid
        const targetBidder = editing ? editing.bidder.uuid : bidderUuid
        const value = Number(amount)
        if (!targetLot) return setError("Pick the lot")
        if (!targetBidder) return setError("Pick the bidder")
        if (!Number.isFinite(value) || value <= 0) return setError("Enter the maximum bid")
        if (minimum && value < Number(minimum)) return setError(`The maximum bid must be at least ${money(minimum, currency)}`)

        setError(null)
        setSaving(true)
        try {
            const { message } = await setProxyBidForBidder(targetLot, targetBidder, value, token)
            toast.success(message)
            onSaved()
            onOpenChange(false)
        } catch (err) {
            setError(getErrorMessage(err, "Could not save the proxy bid"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="sm:max-w-xl" showCloseButton={!saving}>
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#414141]">
                            <Bot className="h-5 w-5 text-[#7B2D52]" />
                            {editing ? `Edit proxy bid · Lot #${editing.lot.itemNumber}` : "Add a proxy bid for a bidder"}
                        </DialogTitle>
                        <DialogDescription>
                            Proxy bids can be set or changed for a registered bidder until the auction goes live — or while its
                            proxy bidding is switched on — as long as the lot hasn&apos;t opened. The bidder gets the usual
                            confirmation email and SMS.
                        </DialogDescription>
                    </DialogHeader>

                    {editing ? (
                        <div className="grid gap-1 rounded-[8px] bg-[#F4F4F4] px-4 py-3 text-[12px]">
                            <p className="font-semibold text-slate-900">
                                {editing.bidder.name ?? editing.bidder.username}
                                {editing.bidder.paddle && <span className="font-normal text-[#8A8D94]"> · Paddle #{editing.bidder.paddle}</span>}
                            </p>
                            <p className="text-slate-700">
                                Lot #{editing.lot.itemNumber} · {editing.lot.title}
                            </p>
                            <p className="text-[#8A8D94]">{editing.auction.title}</p>
                        </div>
                    ) : (
                        <>
                            {optionsError ? (
                                <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{optionsError}</p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="grid gap-1.5">
                                        <span className="text-[12px] font-medium text-slate-600">Auction</span>
                                        <Select
                                            value={auctionUuid}
                                            onValueChange={(value) => {
                                                if (value === null) return
                                                setAuctionUuid(value)
                                                setLotUuid("")
                                                setBidderUuid("")
                                                setError(null)
                                            }}
                                        >
                                            <SelectTrigger className="h-10 w-full bg-white text-[13px]" aria-label="Auction">
                                                <SelectValue>
                                                    <span className="truncate">
                                                        {auction ? auction.title : auctions === null ? "Loading auctions…" : "Pick an auction"}
                                                    </span>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-80 bg-white">
                                                <SelectGroup>
                                                    {(auctions ?? []).map((a) => (
                                                        <SelectItem key={a.uuid} value={a.uuid}>
                                                            <span className="truncate">{a.title}</span>
                                                            <span className="ml-auto shrink-0 pl-2 text-[11px] text-[#8A8D94]">
                                                                {AUCTION_STATUS_LABELS[a.status] ?? a.status} · {startDate.format(new Date(a.startTime))}
                                                                {a.proxyBiddingOpen ? " · proxy on" : " · proxy off"}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        {auctions?.length === 0 && (
                                            <p className="text-[11px] text-[#8A8D94]">No auction can take proxy bids right now.</p>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <span className="text-[12px] font-medium text-slate-600">Lot</span>
                                        <Select
                                            value={lotUuid}
                                            disabled={!auction}
                                            onValueChange={(value) => {
                                                if (value === null) return
                                                setLotUuid(value)
                                                setBidderUuid("")
                                                setError(null)
                                            }}
                                        >
                                            <SelectTrigger className="h-10 w-full bg-white text-[13px]" aria-label="Lot">
                                                <SelectValue>
                                                    <span className="truncate">
                                                        {lot ? `Lot #${lot.itemNumber} · ${lot.title}` : auction ? "Pick a lot" : "Pick an auction first"}
                                                    </span>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-80 bg-white">
                                                <SelectGroup>
                                                    {(auction?.lots ?? []).map((l) => (
                                                        <SelectItem key={l.uuid} value={l.uuid}>
                                                            <span className="truncate">
                                                                Lot #{l.itemNumber} · {l.title}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        {auction && auction.lots.length === 0 && (
                                            <p className="text-[11px] text-[#8A8D94]">Every lot in this auction has opened.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {lot && (
                                <div className="grid gap-2">
                                    <label htmlFor="proxy-bidder" className="text-[12px] font-medium text-slate-600">
                                        Bidder (registered for this auction)
                                    </label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            id="proxy-bidder"
                                            autoComplete="off"
                                            placeholder="Paddle, name or email"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            className="h-10 pl-9 text-[13px]"
                                        />
                                    </div>
                                    {!lotBidders ? (
                                        <p className="flex items-center justify-center rounded-md bg-slate-50 px-3 py-4 text-[12px] text-slate-500">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Loading bidders…
                                        </p>
                                    ) : lotBidders.error ? (
                                        <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{lotBidders.error}</p>
                                    ) : shownBidders.length === 0 ? (
                                        <p className="rounded-md bg-slate-50 px-3 py-4 text-center text-[12px] text-slate-500">
                                            {q
                                                ? "No registered bidder on this lot matches that"
                                                : "No bidder has registered for this auction yet"}
                                        </p>
                                    ) : (
                                        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                                            {shownBidders.map((b) => {
                                                const selected = b.uuid === bidderUuid
                                                return (
                                                    <button
                                                        key={b.uuid}
                                                        type="button"
                                                        onClick={() => {
                                                            setBidderUuid(b.uuid)
                                                            setError(null)
                                                        }}
                                                        className={cn(
                                                            "flex min-w-0 cursor-pointer flex-col rounded-[8px] border px-3 py-2 text-left transition-colors",
                                                            b.proxyMax
                                                                ? "border-violet-300 bg-violet-50/70 hover:border-violet-500"
                                                                : "border-slate-200 bg-white hover:border-[#7B2D52]",
                                                            selected && "border-[#7B2D52] ring-2 ring-[#7B2D52]/30"
                                                        )}
                                                    >
                                                        <span className="flex items-center justify-between gap-2">
                                                            <span className="text-[13px] font-semibold text-[#414141]">
                                                                {b.paddle ? `#${b.paddle}` : "No paddle"}
                                                            </span>
                                                            {selected && <Check className="h-3.5 w-3.5 text-[#7B2D52]" />}
                                                        </span>
                                                        <span className="truncate text-[12px] text-slate-600" title={b.email}>
                                                            {b.name ?? b.username}
                                                        </span>
                                                        {b.proxyMax && (
                                                            <span className="mt-0.5 truncate text-[10px] font-medium text-[#7b365d]">
                                                                Proxy up to {money(b.proxyMax, currency)}
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <div className="grid gap-1.5">
                        <label htmlFor="proxy-amount" className="text-[12px] font-medium text-slate-600">
                            Maximum bid ({currency})
                        </label>
                        <Input
                            id="proxy-amount"
                            type="number"
                            min={minimum ?? undefined}
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-11 text-[16px] font-semibold tabular-nums"
                        />
                        <p className="text-[11px] text-slate-500">
                            {Number(amount) > 0 ? money(amount, currency) : "—"}
                            {minimum && ` · minimum ${money(minimum, currency)}`}
                            {currentMax && ` · current maximum ${money(currentMax, currency)}`}
                        </p>
                    </div>

                    {adding && bidder?.proxyMax && (
                        <p className="rounded-md bg-violet-50 px-3 py-2 text-[12px] text-[#7b365d]">
                            {bidder.paddle ? `Paddle #${bidder.paddle}` : bidder.name} already has a proxy up to{" "}
                            {money(bidder.proxyMax, currency)} on this lot — saving replaces it.
                        </p>
                    )}
                    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving} className="bg-[#7B2D52] text-white hover:bg-[#62223F]">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? "Saving…" : editing || bidder?.proxyMax ? "Update proxy bid" : "Set proxy bid"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
