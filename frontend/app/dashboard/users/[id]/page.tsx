'use client'

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import { AppDispatch, RootState } from "@/redux/store"
import { getUserById } from "@/services/operations/user.api"
import { User } from "@/lib/types/user.types"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { KycUpload } from "@/components/core/Dashboard/users/KycUpload"
import UserProfile from "@/components/core/Dashboard/users/UserProfiile"

const getFullName = (user: User) => {
    const fullName = `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim()
    return fullName || user.username
}

const getInitials = (user: User) => {
    const name = getFullName(user) !== "-" ? getFullName(user) : user.username
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

const statusLabel: Record<string, string> = {
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    PENDING_VERIFICATION: "Pending Verification",
}

export default function UserPage() {
    const { id } = useParams<{ id: string }>()

    const dispatch = useDispatch<AppDispatch>()
    const { selectedUser: user, selectedUserLoading, selectedUserError } =
        useSelector((state: RootState) => state.user)

    useEffect(() => {
        if (id) dispatch(getUserById(id))
    }, [dispatch, id])

    if (selectedUserLoading) {
        return <div className="p-6 text-sm text-muted-foreground">Loading user...</div>
    }

    if (selectedUserError || !user) {
        return <div className="p-6">{selectedUserError || "User not found"}</div>
    }

    const isSuspended = user.status === "SUSPENDED"

    return (
        <div className="p-6">

            {isSuspended && (
                <div className="w-full h-18.5 bg-[#FEE2E2] rounded-[12px] p-3.5 mb-6">
                    <div className="flex items-center">
                        <h1 className="text-[#DC2626] text-[16px] font-bold">Account Suspended</h1>
                    </div>
                    <div>
                        <p className="text-[13px]">This account has been suspended and cannot place bids.</p>
                    </div>
                </div>
            )}

            <div className="w-full rounded-[8px] bg-[#f8f8f8] px-5 py-4 h-40.75">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">

                        <Avatar className="h-14 w-14">
                            <AvatarImage
                                src={user.profile?.avatarUrl || "/images/user-avatar.png"}
                                alt={getFullName(user)}
                            />
                            <AvatarFallback className="bg-[#e5e5e5] text-sm font-semibold text-[#414141]">
                                {getInitials(user)}
                            </AvatarFallback>
                        </Avatar>

                        <h1 className="text-[24px] font-bold text-[#0F172A]">
                            {getFullName(user)}
                        </h1>

                    </div>

                    <Badge
                        variant="secondary"
                        className="rounded-full bg-[#e7e7e7] px-3 py-1 text-[10px] font-medium text-[#414141] hover:bg-[#e7e7e7]"
                    >
                        {statusLabel[user.status] ?? user.status}
                    </Badge>

                </div>

                <div className="my-2 border-t border-[#e3e3e3]" />

                <div className="flex items-center gap-8 mt-3">
                    <div>
                        <p className="text-[12px] font-medium text-[#414141]">Email address</p>
                        <p className="mt-0.5 text-[14px] text-[#414141]">{user.email}</p>
                    </div>

                    <div>
                        <p className="text-[12px] font-medium text-[#414141]">Contact no.</p>
                        <p className="mt-0.5 text-[14px] text-[#414141]">{user.phone ?? "-"}</p>
                    </div>

                    <div>
                        <p className="text-[12px] font-medium text-[#414141]">Created on</p>
                        <p className="mt-0.5 text-[14px] text-[#414141]">
                            {new Date(user.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                        </p>
                    </div>
                </div>

            </div>

            {/* No KYC yet → show upload, otherwise show profile */}
            {!user.kyc ? (
                <KycUpload />
            ) : (
                <UserProfile user={user} />
            )}

        </div>
    )
}