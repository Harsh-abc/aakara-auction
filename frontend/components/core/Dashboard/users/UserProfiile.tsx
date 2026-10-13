"use client"

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Pencil } from "lucide-react";

import { StatsCard } from "@/components/common/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AppDispatch, RootState } from "@/redux/store";
import { setKycStatus, updateUserDetails } from "@/services/operations/user.api";
import { UpdateUserDetailsPayload, User } from "@/lib/types/user.types";

// must match the roles on PATCH /users/:uuid/details and /users/:uuid/kyc/status
const USER_EDIT_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF"]

interface UserProfileProps {
    user: User
}

interface InfoRowProps {
    label: string
    value?: string
    valueClassName?: string
    // replaces the value, e.g. with inputs while editing
    children?: React.ReactNode
}

function InfoRow({
    label,
    value,
    valueClassName = "text-[#414141]",
    children,
}: InfoRowProps) {
    return (
        <div className="grid grid-cols-[1fr_1fr] items-center">
            <p className="text-[14px] font-normal text-[#414141]">
                {label}
            </p>

            {children ?? (
                <p className={`text-[14px] font-bold ${valueClassName}`}>
                    {value}
                </p>
            )}
        </div>
    )
}

function CardHeader({ title, onEdit }: { title: string; onEdit?: () => void }) {
    return (
        <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[24px] font-bold text-[#0F172A]">
                {title}
            </h2>
            {onEdit && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={onEdit}
                    className="h-8 rounded-[6px] px-3 text-[11px]"
                >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                </Button>
            )}
        </div>
    )
}

function EditActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
    return (
        <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" disabled={saving} onClick={onCancel} className="h-9 px-4 text-[12px]">
                Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-9 bg-[#0F172A] px-4 text-[12px] text-white hover:bg-[#1E293B]">
                {saving ? "Saving..." : "Save"}
            </Button>
        </div>
    )
}

const inputClassName = "h-9 bg-white text-[13px]"

// yyyy-MM-dd for <input type="date">; date of birth is stored at UTC midnight
const toDateInput = (date: string | null | undefined) => (date ? date.slice(0, 10) : "")

/** Switch for marking KYC verified / not verified by hand, with a confirmation step. */
function KycStatusToggle({ user }: { user: User }) {
    const dispatch = useDispatch<AppDispatch>()
    const saving = useSelector((state: RootState) => state.user.settingKycStatus)

    const isVerified = user.kyc?.status === "VERIFIED"
    // the status the switch is asking to move to, while the dialog is open
    const [target, setTarget] = useState<boolean | null>(null)
    const [reason, setReason] = useState("")

    const close = () => {
        setTarget(null)
        setReason("")
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        // the dialog is portaled, but React still bubbles its submit to the card's form
        event.stopPropagation()
        if (target === null || (!target && !reason.trim())) return

        try {
            await dispatch(setKycStatus({ uuid: user.uuid, verified: target, reason: reason.trim() })).unwrap()
            toast.success(target ? "KYC marked as verified" : "KYC marked as not verified. This user can't bid until it's verified again.")
            close()
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not change the KYC status")
        }
    }

    return (
        <>
            <Switch
                checked={isVerified}
                disabled={saving}
                onCheckedChange={(checked) => setTarget(checked)}
                aria-label={isVerified ? "Mark KYC as not verified" : "Mark KYC as verified"}
                className="data-checked:bg-[#16A34A]"
            />

            <Dialog open={target !== null} onOpenChange={(open) => !open && close()}>
                <DialogContent className="gap-5 bg-white p-6 sm:max-w-md">
                    <DialogHeader className="pr-10">
                        <DialogTitle className="text-xl font-bold">
                            {target ? "Mark KYC as verified?" : "Mark KYC as not verified?"}
                        </DialogTitle>
                        <DialogDescription className="text-[13px] text-[#62666F]">
                            {target
                                ? "This overrides the document review: the KYC counts as verified even if required documents aren't approved. Reviewing or adding a document later works the status out from the documents again."
                                : "This user loses bidding access straight away, and their maximum bids are dropped. Reviewing or adding a document later works the status out from the documents again."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {target === false && (
                            <div>
                                <label htmlFor="kyc-status-reason" className="mb-1.5 block text-[12px] font-medium text-[#414141]">
                                    Reason <span className="font-normal text-[#999]">(the user sees this)</span>
                                </label>
                                <Textarea
                                    id="kyc-status-reason"
                                    autoFocus
                                    rows={3}
                                    maxLength={300}
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    placeholder="Why is this KYC no longer verified?"
                                    className="resize-none text-[13px]"
                                />
                            </div>
                        )}

                        <DialogFooter className="mx-0 mb-0 grid grid-cols-2 gap-3 rounded-none border-t-0 bg-transparent p-0">
                            <DialogClose render={<Button type="button" variant="outline" className="h-11" />}>
                                Cancel
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={saving || (target === false && !reason.trim())}
                                className={`h-11 text-white ${target ? "bg-[#16A34A] hover:bg-[#15803D]" : "bg-red-500 hover:bg-red-600"}`}
                            >
                                {saving ? "Saving..." : target ? "Mark verified" : "Mark not verified"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

const formatDate = (date: string | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })
}

// BIDDER -> Bidder, SUPER_ADMIN -> Super Admin
const formatRole = (role: string) =>
    role
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ")

export default function UserProfile({ user }: UserProfileProps) {

    const dispatch = useDispatch<AppDispatch>()
    const role = useSelector((state: RootState) => state.auth.role)
    const saving = useSelector((state: RootState) => state.user.savingUserDetails)
    const canEdit = !!role && USER_EDIT_ROLES.includes(role)

    const profile = user.profile
    const fullName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || user.username

    // which card is in edit mode, and its draft values
    const [editing, setEditing] = useState<"personal" | "account" | null>(null)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [dateOfBirth, setDateOfBirth] = useState("")
    const [username, setUsername] = useState("")

    const startEditing = (card: "personal" | "account") => {
        if (profile?.firstName || profile?.lastName) {
            setFirstName(profile.firstName ?? "")
            setLastName(profile.lastName ?? "")
        } else {
            // self-registered users only have a username; start from the name shown on the page
            const [first = "", ...rest] = (profile?.displayName || user.username).trim().split(/\s+/)
            setFirstName(first)
            setLastName(rest.join(" "))
        }
        setDateOfBirth(toDateInput(profile?.dateOfBirth))
        setUsername(user.username)
        setEditing(card)
    }

    const save = async (details: Omit<UpdateUserDetailsPayload, "uuid">) => {
        try {
            await dispatch(updateUserDetails({ uuid: user.uuid, ...details })).unwrap()
            toast.success("Details updated")
            setEditing(null)
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not save the details")
        }
    }

    const savePersonal = (event: React.FormEvent) => {
        event.preventDefault()
        save({
            firstName: firstName.trim() || null,
            lastName: lastName.trim() || null,
            dateOfBirth: dateOfBirth || null,
        })
    }

    const saveAccount = (event: React.FormEvent) => {
        event.preventDefault()
        const next = username.trim()
        if (next === user.username) {
            setEditing(null)
        } else if (next.length < 3) {
            toast.error("Username must be at least 3 characters")
        } else {
            save({ username: next })
        }
    }

    const cityState = [profile?.city, profile?.state].filter(Boolean).join(", ") || "-"

    const kycStatus = user.kyc?.status ?? "Not Uploaded"
    const isKycVerified = user.kyc?.status === "VERIFIED"

    const totalBids = user._count.bids
    const wonAuctions = user._count.auctionsWon
    const joinedAuctions = user._count.auctionParticipations
    const successRate = joinedAuctions > 0 ? ((wonAuctions / joinedAuctions) * 100).toFixed(1) : "0"

    return (
        <div>
            <div
                className="
                            grid
                            grid-cols-1
                            sm:grid-cols-2
                            lg:grid-cols-4
                            py-6
                          "
            >

                {
                    isKycVerified && (
                        <>
                            <StatsCard
                                title="Total Bids Placed"
                                value={String(totalBids)}
                                description={`Joined ${joinedAuctions} auctions`}
                                image={"/admin/statscard05.png"}
                                imageClassName="text-slate-600"
                            />

                            <StatsCard
                                title="Won Auctions"
                                value={String(wonAuctions)}
                                description={`Success Rate: ${successRate}%`}
                                image={"/admin/statscard06.png"}
                                imageClassName="text-emerald-500"
                            />

                            <StatsCard
                                title="Auctions Joined"
                                value={String(joinedAuctions)}
                                description="Registered as participant"
                                image={"/admin/statscard07.png"}
                                imageClassName="text-orange-500"
                            />

                            <StatsCard
                                title="Total Value Acquired"
                                value="-"
                                description="Available after settlement"
                                image={"/admin/statscard08.png"}
                                imageClassName="text-slate-600"
                            />
                        </>
                    )
                }

            </div>

            <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-2">

                <div className="w-full rounded-[12px] bg-dashboardFormBg p-6">

                    <CardHeader
                        title="Personal Information"
                        onEdit={canEdit && editing !== "personal" ? () => startEditing("personal") : undefined}
                    />

                    <form onSubmit={savePersonal} className="space-y-4">
                        {editing === "personal" ? (
                            <InfoRow label="Full Name">
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        autoFocus
                                        maxLength={50}
                                        value={firstName}
                                        onChange={(event) => setFirstName(event.target.value)}
                                        placeholder="First name"
                                        aria-label="First name"
                                        className={inputClassName}
                                    />
                                    <Input
                                        maxLength={50}
                                        value={lastName}
                                        onChange={(event) => setLastName(event.target.value)}
                                        placeholder="Last name"
                                        aria-label="Last name"
                                        className={inputClassName}
                                    />
                                </div>
                            </InfoRow>
                        ) : (
                            <InfoRow label="Full Name" value={fullName} />
                        )}
                        <InfoRow label="Email Address" value={user.email} />
                        <InfoRow label="Contact Number" value={user.phone ?? "-"} />
                        {editing === "personal" ? (
                            <InfoRow label="Date of Birth">
                                <Input
                                    type="date"
                                    max={new Date().toISOString().slice(0, 10)}
                                    value={dateOfBirth}
                                    onChange={(event) => setDateOfBirth(event.target.value)}
                                    aria-label="Date of birth"
                                    className={inputClassName}
                                />
                            </InfoRow>
                        ) : (
                            <InfoRow label="Date of Birth" value={formatDate(profile?.dateOfBirth ?? null)} />
                        )}
                        <InfoRow label="City / State" value={cityState} />
                        <InfoRow label="Postal Code" value={profile?.pincode ?? "-"} />
                        <InfoRow label="Country" value={profile?.country ?? "-"} />

                        {editing === "personal" && <EditActions saving={saving} onCancel={() => setEditing(null)} />}
                    </form>

                </div>

                <div className="w-full rounded-[12px] bg-dashboardFormBg p-6">

                    <CardHeader
                        title="Account Security Details"
                        onEdit={canEdit && editing !== "account" ? () => startEditing("account") : undefined}
                    />

                    <form onSubmit={saveAccount} className="space-y-4">

                        {editing === "account" ? (
                            <InfoRow label="Username">
                                <Input
                                    autoFocus
                                    maxLength={50}
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    aria-label="Username"
                                    className={inputClassName}
                                />
                            </InfoRow>
                        ) : (
                            <InfoRow label="Username" value={user.username} />
                        )}

                        <InfoRow label="Registration Date" value={formatDate(user.createdAt)} />

                        <InfoRow label="Account Role" value={formatRole(user.role.name)} />

                        <InfoRow label="KYC Status">
                            <div className="flex items-center gap-3">
                                <p className={`text-[14px] font-bold ${isKycVerified ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                                    {kycStatus}
                                </p>
                                {canEdit && <KycStatusToggle user={user} />}
                            </div>
                        </InfoRow>

                        <InfoRow label="Last Active IP" value={user.lastLoginIp ?? "-"} />

                        <InfoRow label="Last Login" value={formatDate(user.lastLoginAt)} />

                        <InfoRow
                            label="Email Verified"
                            value={user.emailVerified ? "Yes" : "No"}
                            valueClassName={user.emailVerified ? "text-[#16A34A]" : "text-[#DC2626]"}
                        />

                        {editing === "account" && <EditActions saving={saving} onCancel={() => setEditing(null)} />}

                    </form>

                </div>

            </div>

        </div>
    )
}