"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Gauge, IndianRupee } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppDispatch, useAppSelector } from "@/hooks/redux"
import { useCurrencies } from "@/hooks/useCurrencies"
import { DASHBOARD_ROLES } from "@/lib/constants/roles"
import { setBiddingLimit } from "@/services/operations/user.api"
import type { RoleChangedBy, User } from "@/lib/types/user.types"

/*
 * Bidding limit — optional, one per user, below "Verified for lots". While set, no bid, floor bid or
 * proxy maximum of theirs can go above it (the backend refuses them). It's in one currency: lots in
 * another currency can't be bid on while it's set.
 */

const personName = (person: Pick<User, "username" | "profile"> | RoleChangedBy) => {
    const fullName = `${person.profile?.firstName ?? ""} ${person.profile?.lastName ?? ""}`.trim()
    return person.profile?.displayName || fullName || person.username
}

const formatDateTime = (date: string) =>
    new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })

const formatMoney = (amount: number | string, currency: string) => {
    try {
        return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(Number(amount))
    } catch {
        return `${currency} ${amount}`
    }
}

// digits and one decimal point, at most 2 decimals
const cleanAmount = (value: string) => {
    const [whole, ...rest] = value.replace(/[^\d.]/g, "").split(".")
    return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole
}

export function BiddingLimit({ user }: { user: User }) {
    const dispatch = useAppDispatch()
    const myRole = useAppSelector((state) => state.auth.role)
    const isChanging = useAppSelector((state) => state.user.changingBiddingLimitFor) === user.uuid
    const { currencies } = useCurrencies()

    const [editOpen, setEditOpen] = useState(false)
    const [removeOpen, setRemoveOpen] = useState(false)
    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState("INR")

    // team members don't bid
    if (DASHBOARD_ROLES.includes(user.role.name)) return null

    const hasLimit = user.biddingLimit != null
    const limitCurrency = user.biddingLimitCurrency ?? "INR"
    const canEdit = myRole === "SUPER_ADMIN"
    const name = personName(user)

    const by = user.biddingLimitSetBy ? ` by ${personName(user.biddingLimitSetBy)}` : ""
    const when = user.biddingLimitSetAt ? ` on ${formatDateTime(user.biddingLimitSetAt)}` : ""
    const message = hasLimit
        ? `Set${by}${when}. They can't place a bid, floor bid or maximum (proxy) bid above this. Lots in other currencies can't be bid on while it's set.`
        : "No bidding limit. They can bid any amount on the lots they're verified for."

    const openEdit = () => {
        setAmount(hasLimit ? String(Number(user.biddingLimit)) : "")
        setCurrency(limitCurrency)
        setEditOpen(true)
    }

    const save = async (value: number | null) => {
        try {
            const { data } = await dispatch(setBiddingLimit({ uuid: user.uuid, amount: value, currency })).unwrap()
            const proxyNotes = [
                data.proxiesCapped && `${data.proxiesCapped} maximum bid${data.proxiesCapped > 1 ? "s" : ""} lowered to the limit`,
                data.proxiesWithdrawn && `${data.proxiesWithdrawn} in another currency withdrawn`,
            ].filter(Boolean)
            toast.success(
                (value === null
                    ? `${name} no longer has a bidding limit`
                    : `${name}'s bidding limit is ${formatMoney(value, currency)}`) +
                    (proxyNotes.length ? ` (${proxyNotes.join(", ")})` : "")
            )
            setEditOpen(false)
            setRemoveOpen(false)
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not change the bidding limit. Try again.")
        }
    }

    const handleSave = (event: React.FormEvent) => {
        event.preventDefault()
        const value = Number(amount)
        if (!amount || !Number.isFinite(value) || value <= 0) {
            toast.error("Enter a limit greater than zero")
            return
        }
        save(value)
    }

    return (
        <>
            <div
                className={`mb-6 flex w-full items-center justify-between gap-4 rounded-[12px] p-3.5 ${
                    hasLimit ? "bg-[#FEF3C7]" : "bg-[#f8f8f8]"
                }`}
            >
                <div className="flex items-start gap-3">
                    <Gauge className={`mt-0.5 h-5 w-5 shrink-0 ${hasLimit ? "text-[#B45309]" : "text-[#414141]"}`} />
                    <div>
                        <h2 className={`text-[16px] font-bold ${hasLimit ? "text-[#B45309]" : "text-[#0F172A]"}`}>
                            {hasLimit ? `Bidding limit: ${formatMoney(user.biddingLimit!, limitCurrency)}` : "No bidding limit"}
                        </h2>
                        <p className="text-[13px] text-[#414141]">{message}</p>
                    </div>
                </div>

                {canEdit && (
                    <div className="flex shrink-0 items-center gap-2">
                        {hasLimit && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isChanging}
                                onClick={() => setRemoveOpen(true)}
                                className="h-9 bg-white text-[13px] text-red-600 hover:text-red-600"
                            >
                                Remove
                            </Button>
                        )}
                        <Button
                            type="button"
                            disabled={isChanging}
                            onClick={openEdit}
                            className="h-9 bg-[#491B3A] text-[13px] text-white hover:bg-[#491B3A]/90"
                        >
                            {isChanging ? "Updating..." : hasLimit ? "Change limit" : "Set limit"}
                        </Button>
                    </div>
                )}
            </div>

            <Dialog
                open={editOpen}
                onOpenChange={(open) => {
                    if (!isChanging) setEditOpen(open)
                }}
            >
                <DialogContent className="gap-6 bg-white p-6 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {hasLimit ? "Change bidding limit" : "Set bidding limit"}
                        </DialogTitle>
                        <DialogDescription className="text-[13px] text-[#62666F]">
                            {name} won&apos;t be able to bid above this amount, online, from the floor or as a maximum
                            (proxy) bid. Maximum bids they&apos;ve already left above it are lowered to the limit.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="flex flex-col gap-6">
                        <div className="flex items-center gap-2">
                            <Select value={currency} onValueChange={(value) => value !== null && setCurrency(value)}>
                                <SelectTrigger className="h-11! w-28 bg-white" aria-label="Currency">
                                    <SelectValue>{currency}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectGroup>
                                        {currencies.map((option) => (
                                            <SelectItem key={option.code} value={option.code}>
                                                {option.code} {option.symbol ? `(${option.symbol})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <div className="relative flex-1">
                                {currency === "INR" && (
                                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                )}
                                <Input
                                    autoFocus
                                    inputMode="decimal"
                                    placeholder="e.g. 500000"
                                    value={amount}
                                    onChange={(e) => setAmount(cleanAmount(e.target.value))}
                                    className={`h-11 bg-white ${currency === "INR" ? "pl-9" : ""}`}
                                    aria-label="Bidding limit amount"
                                />
                            </div>
                        </div>

                        {Number(amount) > 0 && (
                            <p className="-mt-3 text-[13px] text-[#414141]">
                                Highest bid allowed: <b>{formatMoney(amount, currency)}</b>
                            </p>
                        )}

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isChanging}
                                onClick={() => setEditOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isChanging || !(Number(amount) > 0)}
                                className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                            >
                                {isChanging ? "Saving..." : "Save limit"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={removeOpen}
                onOpenChange={(open) => {
                    if (!open && !isChanging) setRemoveOpen(false)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove bidding limit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <b>{name}</b> will be able to bid any amount again. Maximum bids that were lowered to the
                            limit stay as they are.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isChanging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => save(null)}
                            disabled={isChanging}
                            className="bg-red-600 text-white hover:bg-red-600/90"
                        >
                            {isChanging ? "Removing..." : "Remove limit"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
