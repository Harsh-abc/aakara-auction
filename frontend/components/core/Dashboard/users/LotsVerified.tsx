"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Gavel, ShieldCheck } from "lucide-react"

import { Switch } from "@/components/ui/switch"
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
import { useAppDispatch, useAppSelector } from "@/hooks/redux"
import { setLotsVerified } from "@/services/operations/user.api"
import type { RoleChangedBy, User } from "@/lib/types/user.types"

/*
 * "Verified for lots" — one switch per bidder, below Bidder access. On: verified on every lot
 * they're registered for in auctions not yet over, and on lots they register for later.
 * Off: those verifications are taken back (auctions already over keep theirs).
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

export function LotsVerified({ user }: { user: User }) {
    const dispatch = useAppDispatch()
    const myRole = useAppSelector((state) => state.auth.role)
    const isChanging = useAppSelector((state) => state.user.changingLotsVerifiedFor) === user.uuid
    const [confirmOpen, setConfirmOpen] = useState(false)

    // only bidders register for auctions, so only they have lots to be verified on
    if (user.role.name !== "BIDDER") return null

    const isVerified = !!user.lotsVerifiedAt
    const canVerify = user.status === "ACTIVE" && user.kyc?.status === "VERIFIED"
    const canToggle = myRole === "SUPER_ADMIN"
    // turning it off is always allowed; turning it on needs an active account with approved KYC (the backend checks too)
    const toggleDisabled = isChanging || (!isVerified && !canVerify)
    const name = personName(user)

    const by = user.lotsVerifiedBy ? ` by ${personName(user.lotsVerifiedBy)}` : ""
    const message = isVerified
        ? `Verified${by} on ${formatDateTime(user.lotsVerifiedAt!)}. They can bid on every lot they register for.`
        : canVerify
            ? "Not verified for lots. Once verified, they can bid on every lot they register for."
            : "Not verified for lots. The account must be active with approved KYC before they can be verified."

    const handleConfirm = async () => {
        try {
            const { data } = await dispatch(setLotsVerified({ uuid: user.uuid, verified: !isVerified })).unwrap()
            const lots = data.changed === 1 ? "1 lot" : `${data.changed} lots`
            toast.success(
                isVerified
                    ? `${name} is no longer verified for lots (${lots} updated)`
                    : `${name} is verified for lots (${lots} updated)`
            )
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not change lot verification. Try again.")
        } finally {
            setConfirmOpen(false)
        }
    }

    return (
        <>
            <div
                className={`mb-6 flex w-full items-center justify-between gap-4 rounded-[12px] p-3.5 ${
                    isVerified ? "bg-[#DCFCE7]" : "bg-[#f8f8f8]"
                }`}
            >
                <div className="flex items-start gap-3">
                    {isVerified ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#16A34A]" />
                    ) : (
                        <Gavel className="mt-0.5 h-5 w-5 shrink-0 text-[#414141]" />
                    )}
                    <div>
                        <h2 className={`text-[16px] font-bold ${isVerified ? "text-[#16A34A]" : "text-[#0F172A]"}`}>
                            {isVerified ? "Verified for lots" : "Not verified for lots"}
                        </h2>
                        <p className="text-[13px] text-[#414141]">{message}</p>
                    </div>
                </div>

                {canToggle && (
                    <label className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-[#414141]">
                        {isChanging ? "Updating..." : "Verify for lots"}
                        <Switch
                            checked={isVerified}
                            disabled={toggleDisabled}
                            onCheckedChange={() => setConfirmOpen(true)}
                            aria-label={`Verify ${name} for lots`}
                        />
                    </label>
                )}
            </div>

            <AlertDialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    if (!open && !isChanging) setConfirmOpen(false)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isVerified ? "Remove lot verification?" : "Verify for all lots?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isVerified ? (
                                <>
                                    <b>{name}</b> will no longer be verified on the lots of upcoming and live auctions, so
                                    they can&apos;t bid on them, and any maximum bids they&apos;ve set there will be
                                    cancelled. Bids already placed stand.
                                </>
                            ) : (
                                <>
                                    <b>{name}</b> will be verified on every lot they&apos;re registered for in upcoming
                                    and live auctions, and on lots they register for from now on. You&apos;ll be
                                    recorded as the person who verified them.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isChanging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={isChanging}
                            className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                        >
                            {isChanging ? "Updating..." : isVerified ? "Remove verification" : "Verify"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
