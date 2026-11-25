"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { ChevronLeft, ChevronRight, Loader2, Search, UserMinus, UserPlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector } from "@/hooks/redux"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { AddedBidder, AddedBidderAuction, AddedBiddersPage } from "@/lib/types/addedBidder.types"
import { getAddedBidders, registerBidderForAuction, removeBidderFromAuction } from "@/services/operations/addedBidder.api"

import { DASHBOARD_TIME_ZONE, PanelMessage, StatusPill } from "../home/dashboardUi"

const PAGE_SIZE = 20

const day = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: DASHBOARD_TIME_ZONE })

// Bidder accounts a super admin created. Registering one for an auction gives them a paddle
// and verifies them on every lot, so they show up in Proxy Bids → "Add a proxy bid".
export function AddedBidders() {
    const token = useAppSelector((state) => state.auth.accessToken)
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebouncedValue(search.trim())
    const [page, setPage] = useState(1)
    const [data, setData] = useState<AddedBiddersPage | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [reload, setReload] = useState(0)
    const [registering, setRegistering] = useState<AddedBidder | null>(null)
    const [removing, setRemoving] = useState<{ bidder: AddedBidder; registration: AddedBidder["registrations"][number] } | null>(null)

    // a new search starts from the first page
    const [lastSearch, setLastSearch] = useState(debouncedSearch)
    if (debouncedSearch !== lastSearch) {
        setLastSearch(debouncedSearch)
        setPage(1)
    }

    useEffect(() => {
        if (!token) return
        let cancelled = false
        setLoading(true)
        getAddedBidders(token, { page, limit: PAGE_SIZE, search: debouncedSearch || undefined })
            .then((result) => {
                if (cancelled) return
                setData(result)
                setError(null)
            })
            .catch((err) => !cancelled && setError(getErrorMessage(err, "Could not load the bidders")))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [token, page, debouncedSearch, reload])

    const pagination = data?.pagination
    // registrations can only be changed on auctions that are still upcoming or running
    const editableAuctions = new Set(data?.auctions.map((a) => a.uuid) ?? [])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Name, email or phone"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 bg-white pl-9 text-[13px]"
                    />
                </div>
                {pagination && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
                        {pagination.total.toLocaleString("en-IN")} added by super admins
                    </span>
                )}
            </div>

            {error ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
            ) : !data ? (
                <PanelMessage>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading bidders…
                </PanelMessage>
            ) : data.bidders.length === 0 ? (
                <PanelMessage>
                    {debouncedSearch ? "No bidder added by a super admin matches that" : "No bidder accounts have been added by a super admin yet"}
                </PanelMessage>
            ) : (
                <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Bidder</th>
                                    <th className="px-4 py-3">Contact</th>
                                    <th className="px-4 py-3">Added</th>
                                    <th className="px-4 py-3">Auctions &amp; paddles</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.bidders.map((bidder) => (
                                    <tr key={bidder.uuid} className="align-top">
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/dashboard/users/${bidder.uuid}`}
                                                className="font-semibold text-[#414141] hover:text-[#7B2D52] hover:underline"
                                            >
                                                {bidder.name ?? bidder.username}
                                            </Link>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {bidder.status !== "ACTIVE" && <StatusPill tone="red">{bidder.status.toLowerCase()}</StatusPill>}
                                                {bidder.kycStatus !== "VERIFIED" && <StatusPill tone="amber">KYC {bidder.kycStatus.toLowerCase()}</StatusPill>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div className="max-w-56 truncate" title={bidder.email}>
                                                {bidder.email}
                                            </div>
                                            {bidder.phone && <div className="text-[12px] text-slate-500">{bidder.phone}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div>{day.format(new Date(bidder.createdAt))}</div>
                                            {bidder.createdBy && <div className="text-[12px] text-slate-500">by {bidder.createdBy}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {bidder.registrations.length === 0 ? (
                                                <span className="text-[12px] text-slate-400">Not registered for any auction</span>
                                            ) : (
                                                <ul className="grid gap-1">
                                                    {bidder.registrations.map((r) => (
                                                        <li key={r.auction.uuid} className="flex items-center gap-2">
                                                            <StatusPill tone="maroon">#{r.paddleNumber}</StatusPill>
                                                            <span className="max-w-56 truncate text-slate-700" title={r.auction.title}>
                                                                {r.auction.title}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400">{AUCTION_STATUS_LABELS[r.auction.status]}</span>
                                                            {editableAuctions.has(r.auction.uuid) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRemoving({ bidder, registration: r })}
                                                                    className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                                    title={`Remove from ${r.auction.title}`}
                                                                    aria-label={`Remove from ${r.auction.title}`}
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="sm"
                                                className="bg-[#7B2D52] text-white hover:bg-[#62223F]"
                                                onClick={() => setRegistering(bidder)}
                                            >
                                                <UserPlus className="h-4 w-4" />
                                                Register for auction
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-3 flex items-center justify-end gap-2 text-[13px] text-slate-600">
                            <span>
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.totalPages || loading}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <RegisterDialog
                bidder={registering}
                auctions={data?.auctions ?? []}
                token={token}
                onClose={() => setRegistering(null)}
                onRegistered={() => setReload((n) => n + 1)}
            />

            <RemoveDialog
                target={removing}
                token={token}
                onClose={() => setRemoving(null)}
                onRemoved={() => setReload((n) => n + 1)}
            />
        </div>
    )
}

interface RemoveDialogProps {
    target: { bidder: AddedBidder; registration: AddedBidder["registrations"][number] } | null
    token: string | null
    onClose: () => void
    onRemoved: () => void
}

function RemoveDialog({ target, token, onClose, onRemoved }: RemoveDialogProps) {
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // fresh state for each target
    const key = target ? `${target.bidder.uuid}:${target.registration.auction.uuid}` : null
    const [forKey, setForKey] = useState<string | null>(null)
    if (key !== forKey) {
        setForKey(key)
        setError(null)
    }

    const name = target ? (target.bidder.name ?? target.bidder.username) : ""

    const submit = async () => {
        if (!target) return
        setError(null)
        setSaving(true)
        try {
            await removeBidderFromAuction(target.registration.auction.uuid, target.bidder.uuid, token)
            toast.success(`${name} was removed from ${target.registration.auction.title}`)
            onRemoved()
            onClose()
        } catch (err) {
            setError(getErrorMessage(err, "Could not remove the bidder"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={!!target} onOpenChange={(open) => !open && !saving && onClose()}>
            <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#414141]">
                        <UserMinus className="h-5 w-5 text-red-600" />
                        Remove from auction
                    </DialogTitle>
                    <DialogDescription>
                        {name} will lose paddle #{target?.registration.paddleNumber} for {target?.registration.auction.title}, is unverified on
                        all its lots and any proxy bids they have there are withdrawn. You can register them again later — they may get a
                        different paddle.
                    </DialogDescription>
                </DialogHeader>

                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" disabled={saving} onClick={submit} className="bg-red-600 text-white hover:bg-red-700">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {saving ? "Removing…" : "Remove from auction"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface RegisterDialogProps {
    bidder: AddedBidder | null
    auctions: AddedBidderAuction[]
    token: string | null
    onClose: () => void
    onRegistered: () => void
}

function RegisterDialog({ bidder, auctions, token, onClose, onRegistered }: RegisterDialogProps) {
    const [auctionUuid, setAuctionUuid] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // fresh form for each bidder
    const [forBidder, setForBidder] = useState<string | null>(null)
    if ((bidder?.uuid ?? null) !== forBidder) {
        setForBidder(bidder?.uuid ?? null)
        setAuctionUuid("")
        setError(null)
    }

    const registeredIn = new Set(bidder?.registrations.map((r) => r.auction.uuid) ?? [])
    const available = auctions.filter((a) => !registeredIn.has(a.uuid))
    const auction = available.find((a) => a.uuid === auctionUuid) ?? null

    const submit = async () => {
        if (!bidder) return
        if (!auction) return setError("Pick the auction")
        setError(null)
        setSaving(true)
        try {
            await registerBidderForAuction(auction.uuid, bidder.uuid, token)
            toast.success(`${bidder.name ?? bidder.username} is registered for ${auction.title} — paddle assigned`)
            onRegistered()
            onClose()
        } catch (err) {
            setError(getErrorMessage(err, "Could not register the bidder"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={!!bidder} onOpenChange={(open) => !open && !saving && onClose()}>
            <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#414141]">
                        <UserPlus className="h-5 w-5 text-[#7B2D52]" />
                        Register for an auction
                    </DialogTitle>
                    <DialogDescription>
                        {bidder?.name ?? bidder?.username} gets a paddle number for the auction and is verified on all its lots, so they can
                        bid and staff can set proxy bids for them.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-1.5">
                    <span className="text-[12px] font-medium text-slate-600">Auction</span>
                    <Select
                        value={auctionUuid}
                        disabled={available.length === 0}
                        onValueChange={(value) => {
                            if (value === null) return
                            setAuctionUuid(value)
                            setError(null)
                        }}
                    >
                        <SelectTrigger className="h-10 w-full bg-white text-[13px]" aria-label="Auction">
                            <SelectValue>
                                <span className="truncate">
                                    {auction ? auction.title : available.length === 0 ? "No auction to register for" : "Pick an auction"}
                                </span>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-80 bg-white">
                            <SelectGroup>
                                {available.map((a) => (
                                    <SelectItem key={a.uuid} value={a.uuid}>
                                        <span className="truncate">{a.title}</span>
                                        <span className="ml-auto shrink-0 pl-2 text-[11px] text-[#8A8D94]">
                                            {AUCTION_STATUS_LABELS[a.status]} · {day.format(new Date(a.startTime))}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    {available.length === 0 && (
                        <p className="text-[11px] text-[#8A8D94]">
                            {auctions.length === 0
                                ? "There's no upcoming or running auction."
                                : "They're already registered for every upcoming and running auction."}
                        </p>
                    )}
                </div>

                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={saving || !auction}
                        onClick={submit}
                        className="bg-[#7B2D52] text-white hover:bg-[#62223F]"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {saving ? "Registering…" : "Register & assign paddle"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
