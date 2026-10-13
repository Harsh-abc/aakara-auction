"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { BadgeCheck, ShieldAlert, UserRound } from "lucide-react"

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
import { changeUserRole } from "@/services/operations/user.api"
import type { RoleChangedBy, User } from "@/lib/types/user.types"

// only customer accounts can be toggled; team roles are managed in Settings → Team
const CUSTOMER_ROLES = ["USER", "BIDDER"]

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

// "by Priya Shah on 13 Oct 2026, 3:45 pm"
const changedByText = (user: User) => {
    if (!user.roleChangedBy) return null
    const when = user.roleChangedAt ? ` on ${formatDateTime(user.roleChangedAt)}` : ""
    return `by ${personName(user.roleChangedBy)}${when}`
}

export function BidderAccess({ user }: { user: User }) {
    const dispatch = useAppDispatch()
    const myRole = useAppSelector((state) => state.auth.role)
    const isChanging = useAppSelector((state) => state.user.changingRoleFor) === user.uuid
    const [confirmOpen, setConfirmOpen] = useState(false)

    if (!CUSTOMER_ROLES.includes(user.role.name)) return null

    const isBidder = user.role.name === "BIDDER"
    const kycVerified = user.kyc?.status === "VERIFIED"
    const canToggle = myRole === "SUPER_ADMIN"
    // removing access is always allowed; granting it needs approved KYC (the backend checks too)
    const toggleDisabled = isChanging || (!isBidder && !kycVerified)
    const name = personName(user)
    const changedBy = changedByText(user)

    // still a bidder, but a KYC approval was taken back — bidding is blocked until it's approved again
    const kycBlocked = isBidder && !kycVerified

    const title = isBidder ? (kycBlocked ? "Bidder · KYC not verified" : "Bidder") : "Not a bidder"
    const message = isBidder
        ? `${changedBy ? `Made a bidder ${changedBy}.` : "Made a bidder before role changes were recorded."}${
            kycBlocked ? " Their KYC is no longer verified, so they can't bid until it's approved again." : ""
        }`
        : changedBy
            ? `Bidder access was removed ${changedBy}.`
            : kycVerified
                ? "KYC is approved. A super admin can make this user a bidder so they can register and bid."
                : "This user can't register for auctions or bid. KYC must be approved before they can become a bidder."

    const handleConfirm = async () => {
        const roleName = isBidder ? "USER" : "BIDDER"
        try {
            await dispatch(changeUserRole({ uuid: user.uuid, roleName })).unwrap()
            toast.success(isBidder ? `${name} is no longer a bidder` : `${name} is now a bidder`)
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not change bidder access. Try again.")
        } finally {
            setConfirmOpen(false)
        }
    }

    return (
        <>
            <div
                className={`mb-6 flex w-full items-center justify-between gap-4 rounded-[12px] p-3.5 ${
                    kycBlocked ? "bg-[#fff4e8]" : isBidder ? "bg-[#DCFCE7]" : "bg-[#f8f8f8]"
                }`}
            >
                <div className="flex items-start gap-3">
                    {kycBlocked ? (
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#b45309]" />
                    ) : isBidder ? (
                        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#16A34A]" />
                    ) : (
                        <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#414141]" />
                    )}
                    <div>
                        <h2
                            className={`text-[16px] font-bold ${
                                kycBlocked ? "text-[#b45309]" : isBidder ? "text-[#16A34A]" : "text-[#0F172A]"
                            }`}
                        >
                            {title}
                        </h2>
                        <p className="text-[13px] text-[#414141]">{message}</p>
                    </div>
                </div>

                {canToggle && (
                    <label className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-[#414141]">
                        {isChanging ? "Updating..." : "Bidder access"}
                        <Switch
                            checked={isBidder}
                            disabled={toggleDisabled}
                            onCheckedChange={() => setConfirmOpen(true)}
                            aria-label={`Bidder access for ${name}`}
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
                        <AlertDialogTitle>{isBidder ? "Remove bidder access?" : "Make this user a bidder?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isBidder ? (
                                <>
                                    <b>{name}</b> will go back to a regular user. They won&apos;t be able to register
                                    for auctions or bid, and any maximum bids they&apos;ve set will be cancelled. Bids
                                    already placed stand.
                                </>
                            ) : (
                                <>
                                    <b>{name}</b> will become a bidder and can register for auctions. You&apos;ll be
                                    recorded as the person who approved them.
                                </>
                            )}{" "}
                            They&apos;ll be logged out of all devices and need to sign in again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isChanging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={isChanging}
                            className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                        >
                            {isChanging ? "Updating..." : isBidder ? "Remove access" : "Make bidder"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
