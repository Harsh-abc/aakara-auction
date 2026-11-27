"use client"

import toast from "react-hot-toast"
import { Phone, PhoneCall } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { useAppDispatch, useAppSelector } from "@/hooks/redux"
import { setPhoneBidder } from "@/services/operations/user.api"
import type { RoleChangedBy, User } from "@/lib/types/user.types"

/*
 * "Phone bidder": one switch per bidder, below "Verified for lots". It marks a bidder whose bids
 * are taken over the phone. Their paddle numbers show in purple on the Bidders page, which also
 * has a "Phone bidder" column. It doesn't change who may bid.
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

export function PhoneBidder({ user }: { user: User }) {
    const dispatch = useAppDispatch()
    const myRole = useAppSelector((state) => state.auth.role)
    const isChanging = useAppSelector((state) => state.user.changingPhoneBidderFor) === user.uuid

    if (user.role.name !== "BIDDER") return null

    const isPhoneBidder = !!user.phoneBidderAt
    const canToggle = myRole === "SUPER_ADMIN"
    const name = personName(user)

    const by = user.phoneBidderBy ? ` by ${personName(user.phoneBidderBy)}` : ""
    const message = isPhoneBidder
        ? `Marked${by} on ${formatDateTime(user.phoneBidderAt!)}. Their paddle numbers show in purple on the Bidders page.`
        : "Not a phone bidder. Turn this on if their bids are taken over the phone."

    const handleChange = async (checked: boolean) => {
        try {
            await dispatch(setPhoneBidder({ uuid: user.uuid, phoneBidder: checked })).unwrap()
            toast.success(checked ? `${name} is marked as a phone bidder` : `${name} is no longer a phone bidder`)
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not change the phone bidder flag. Try again.")
        }
    }

    return (
        <div
            className={`mb-6 flex w-full items-center justify-between gap-4 rounded-[12px] p-3.5 ${
                isPhoneBidder ? "bg-purple-100" : "bg-[#f8f8f8]"
            }`}
        >
            <div className="flex items-start gap-3">
                {isPhoneBidder ? (
                    <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-purple-700" />
                ) : (
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#414141]" />
                )}
                <div>
                    <h2 className={`text-[16px] font-bold ${isPhoneBidder ? "text-purple-700" : "text-[#0F172A]"}`}>
                        {isPhoneBidder ? "Phone bidder" : "Not a phone bidder"}
                    </h2>
                    <p className="text-[13px] text-[#414141]">{message}</p>
                </div>
            </div>

            {canToggle && (
                <label className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-[#414141]">
                    {isChanging ? "Updating..." : "Phone bidder"}
                    <Switch
                        checked={isPhoneBidder}
                        disabled={isChanging}
                        onCheckedChange={handleChange}
                        aria-label={`Mark ${name} as a phone bidder`}
                    />
                </label>
            )}
        </div>
    )
}
