"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Ban, Eye, Loader2, MoreVertical, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { changeUserStatus } from "@/services/operations/user.api"

const displayName = (user: User) =>
    `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() || user.username

export function UserActionsCell({ user }: { user: User }) {
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { role: myRole, user: me } = useAppSelector((state) => state.auth)
    const updating = useAppSelector((state) => state.user.changingStatusFor) === user.uuid
    const [confirmOpen, setConfirmOpen] = useState(false)

    const isSuspended = user.status === "SUSPENDED"
    // super admins only; never yourself or another super admin (the API enforces this too)
    const canChangeStatus = myRole === "SUPER_ADMIN" && me?.uuid !== user.uuid && user.role.name !== "SUPER_ADMIN"
    const name = displayName(user)

    const handleConfirm = async () => {
        try {
            const response = await dispatch(
                changeUserStatus({ uuid: user.uuid, action: isSuspended ? "REACTIVATE" : "SUSPEND" })
            ).unwrap()
            toast.success(response.message)
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not update the account. Try again.")
        } finally {
            setConfirmOpen(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 data-popup-open:bg-slate-100"
                            aria-label={`Actions for ${name}`}
                        />
                    }
                >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                        className="py-2 text-[13px]"
                        onClick={() => router.push(`/dashboard/users/${user.uuid}`)}
                    >
                        <Eye />
                        View user
                    </DropdownMenuItem>

                    {canChangeStatus && (
                        <>
                            <DropdownMenuSeparator />
                            {isSuspended ? (
                                <DropdownMenuItem
                                    className="py-2 text-[13px]"
                                    disabled={updating}
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    <RotateCcw />
                                    Reactivate user
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    variant="destructive"
                                    className="py-2 text-[13px]"
                                    disabled={updating}
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    <Ban />
                                    Suspend user
                                </DropdownMenuItem>
                            )}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    if (!open && !updating) setConfirmOpen(false)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isSuspended ? "Reactivate this user?" : "Suspend this user?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isSuspended ? (
                                <>
                                    <b>{name}</b> ({user.email}) will be able to log in and use the website again.
                                    Their role and KYC are unchanged.
                                </>
                            ) : (
                                <>
                                    <b>{name}</b> ({user.email}) will be logged out of every device straight away
                                    and won&apos;t be able to log in, register for auctions or bid until you
                                    reactivate them. Any maximum bids they&apos;ve set are cancelled; bids already
                                    placed stand.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={updating}
                            className={
                                isSuspended
                                    ? "bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                                    : "bg-red-600 text-white hover:bg-red-700"
                            }
                        >
                            {updating ? "Updating..." : isSuspended ? "Reactivate" : "Suspend user"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
