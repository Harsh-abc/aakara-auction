"use client"

import { useState } from "react"
import toast from "react-hot-toast"

import { Badge } from "@/components/ui/badge"
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
import type { User } from "@/lib/types/user.types"
import { setUserActive } from "@/services/operations/user.api"

// must match the roles on PATCH /users/:uuid/active
const USER_ACTIVE_ROLES = ["SUPER_ADMIN", "ADMIN", "OPERATIONS"]

// statuses that block login; only a super admin's reactivate (row actions) lifts them
const SUSPENDED_STATUSES = ["SUSPENDED", "BANNED", "DEACTIVATED"]

const displayName = (user: User) =>
    `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() || user.username

/**
 * Active / inactive switch for the users table. New signups start active; an inactive
 * account can log in and upload KYC, but can't register for auctions or bid.
 */
export function UserStatusCell({ user }: { user: User }) {
    const dispatch = useAppDispatch()
    const { role: myRole, user: me } = useAppSelector((state) => state.auth)
    const updating = useAppSelector((state) => state.user.changingStatusFor) === user.uuid
    const [confirmOpen, setConfirmOpen] = useState(false)

    if (SUSPENDED_STATUSES.includes(user.status)) {
        return (
            <Badge variant="outline" className="rounded-full border-red-100 bg-red-50 px-3 py-1 text-xs font-normal text-red-500">
                Suspended
            </Badge>
        )
    }

    const isActive = user.status === "ACTIVE"
    // never yourself or a super admin (the API enforces this too)
    const canToggle =
        !!myRole && USER_ACTIVE_ROLES.includes(myRole) && me?.uuid !== user.uuid && user.role.name !== "SUPER_ADMIN"

    const save = async (active: boolean) => {
        try {
            const response = await dispatch(setUserActive({ uuid: user.uuid, active })).unwrap()
            toast.success(response.message)
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not update the account. Try again.")
        } finally {
            setConfirmOpen(false)
        }
    }

    const label = (
        <span className={`text-xs ${isActive ? "text-green-600" : "text-gray-500"}`}>
            {isActive ? "Active" : "Inactive"}
        </span>
    )

    if (!canToggle) {
        return (
            <Badge
                variant="outline"
                className={`rounded-full px-3 py-1 text-xs font-normal ${isActive
                    ? "border-green-100 bg-green-50 text-green-600"
                    : "border-gray-200 bg-gray-100 text-gray-600"
                    }`}
            >
                {isActive ? "Active" : "Inactive"}
            </Badge>
        )
    }

    return (
        <>
            <div className="flex items-center gap-2">
                <Switch
                    checked={isActive}
                    disabled={updating}
                    // switching on is harmless; switching off drops their maximum bids, so it asks first
                    onCheckedChange={(checked) => (checked ? save(true) : setConfirmOpen(true))}
                    aria-label={isActive ? `Make ${displayName(user)} inactive` : `Make ${displayName(user)} active`}
                    className="data-checked:bg-[#16A34A]"
                />
                {label}
            </div>

            <AlertDialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    if (!open && !updating) setConfirmOpen(false)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Make this user inactive?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <b>{displayName(user)}</b> ({user.email}) can still log in and update their profile and KYC,
                            but can&apos;t register for auctions or bid until you make them active again. Any maximum
                            bids they&apos;ve set are cancelled; bids already placed stand.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => save(false)}
                            disabled={updating}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {updating ? "Updating..." : "Make inactive"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
