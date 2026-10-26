"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Loader2, MailWarning, MessageSquareWarning, RefreshCw, RotateCcw, Search, ShieldAlert, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import type { OtpLimit, OtpLimitKind, OtpLimitList } from "@/lib/types/otpLimit.types"
import { cn } from "@/lib/utils"
import { getOtpLimits, resetAllOtpLimits, resetOtpLimit } from "@/services/operations/otpLimit.api"

import { PanelMessage, type PillTone, Segmented, StatTile, StatusPill } from "../home/dashboardUi"
import { ConfirmResetAll, Countdown, CountBar, expiresAt, formatSpan, useExpiringList } from "./securityUi"

// matches the limits in backend/src/libs/otpLimits.js
const KINDS: Record<OtpLimitKind, { label: string; per: string; message: string; tone: PillTone }> = {
    EMAIL_OTP: {
        label: "Email codes",
        per: "per sign-up email",
        message: "Too many OTP requests. Try again later.",
        tone: "maroon",
    },
    SIGNUP_SMS: {
        label: "SMS codes",
        per: "per sign-up email",
        message: "Too many SMS codes requested. Try again later.",
        tone: "amber",
    },
    PHONE_SMS: {
        label: "SMS to a number",
        per: "per phone number",
        message: "Too many codes have been sent to this number.",
        tone: "slate",
    },
}

const KIND_ORDER = Object.keys(KINDS) as OtpLimitKind[]
const ALL = "ALL"

type StatusFilter = "all" | "limited"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "limited", label: "At the limit" },
]

const keyExpiries = (data: OtpLimitList) => data.limits.map((e) => e.expiresInMs)

const rowKey = (entry: OtpLimit) => `${entry.kind}:${entry.subject}`

// =====================================================================
// PAGE
// =====================================================================

export function OtpLimits() {
    const isSuperAdmin = useAppSelector((state) => state.auth.role) === "SUPER_ADMIN"
    const { token, data, error, loading, fetchedAt, now, reload, update } = useExpiringList(getOtpLimits, keyExpiries, isSuperAdmin)

    const [status, setStatus] = useState<StatusFilter>("all")
    const [kind, setKind] = useState<string>(ALL)
    const [searchInput, setSearchInput] = useState("")
    const [resetting, setResetting] = useState<string | null>(null)
    const [confirmAll, setConfirmAll] = useState(false)
    const [resettingAll, setResettingAll] = useState(false)

    if (!isSuperAdmin) {
        return (
            <PanelMessage>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Only super admins can manage OTP limits.
            </PanelMessage>
        )
    }

    const entries = data?.limits ?? null
    const rules = data?.rules ?? null
    const limitedCount = entries?.filter((e) => e.limited).length ?? null
    const smsLimited = entries?.filter((e) => e.limited && e.kind !== "EMAIL_OTP").length ?? null

    const search = searchInput.trim().toLowerCase()
    const shown = (entries ?? []).filter(
        (e) =>
            (status === "all" || e.limited) &&
            (kind === ALL || e.kind === kind) &&
            (!search || e.subject.toLowerCase().includes(search))
    )

    const handleReset = async (entry: OtpLimit) => {
        setResetting(rowKey(entry))
        try {
            toast.success(await resetOtpLimit(token, entry.kind, entry.subject))
            update((list) => ({ ...list, limits: list.limits.filter((e) => rowKey(e) !== rowKey(entry)) }))
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setResetting(null)
            reload()
        }
    }

    const handleResetAll = async () => {
        setResettingAll(true)
        try {
            toast.success(await resetAllOtpLimits(token))
            update((list) => ({ ...list, limits: [] }))
            setConfirmAll(false)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setResettingAll(false)
            reload()
        }
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatTile icon={<ShieldAlert className="h-4 w-4" />} label="At the limit right now" value={limitedCount} tone="red" />
                <StatTile icon={<MessageSquareWarning className="h-4 w-4" />} label="SMS limits reached" value={smsLimited} />
                <StatTile icon={<MailWarning className="h-4 w-4" />} label="Active OTP counters" value={entries?.length ?? null} />
            </div>

            <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search email or phone number…"
                            className="h-10 bg-white pl-9 text-[13px]"
                        />
                    </div>

                    <Select value={kind} onValueChange={(value) => value !== null && setKind(value)}>
                        <SelectTrigger className="h-10 w-44 bg-white text-[13px]" aria-label="Filter by limit">
                            <SelectValue>{kind === ALL ? "All limits" : KINDS[kind as OtpLimitKind].label}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectGroup>
                                <SelectItem value={ALL}>All limits</SelectItem>
                                {KIND_ORDER.map((k) => (
                                    <SelectItem key={k} value={k}>
                                        {KINDS[k].label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    <Segmented value={status} options={STATUS_OPTIONS} onChange={setStatus} />

                    <div className="ml-auto flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 gap-1.5 bg-white text-[12px]"
                            onClick={reload}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", loading && entries && "animate-spin")} />
                            Refresh
                        </Button>
                        <Button
                            type="button"
                            className="h-10 gap-1.5 bg-[#C93B3B] text-[12px] text-white hover:bg-[#A82F2F]"
                            onClick={() => setConfirmAll(true)}
                            disabled={!entries?.length}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset all
                        </Button>
                    </div>
                </div>

                {rules && (
                    <ul className="mt-3 flex flex-col gap-0.5 text-[12px] text-[#62666F]">
                        {KIND_ORDER.map((k) => (
                            <li key={k}>
                                <span className="font-semibold text-slate-800">{KINDS[k].label}:</span> {rules[k].max} {KINDS[k].per} every{" "}
                                {formatSpan(rules[k].windowSeconds)} — then “{KINDS[k].message}”
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-4">
                    {!entries ? (
                        error ? (
                            <PanelMessage>{error}</PanelMessage>
                        ) : (
                            <PanelMessage>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading OTP limits…
                            </PanelMessage>
                        )
                    ) : entries.length === 0 ? (
                        <PanelMessage>
                            <ShieldCheck className="mr-2 h-4 w-4 text-[#1F8A4C]" />
                            No OTP codes requested recently — nobody is limited.
                        </PanelMessage>
                    ) : shown.length === 0 ? (
                        <PanelMessage>No OTP limits match these filters.</PanelMessage>
                    ) : (
                        <div className={cn("overflow-x-auto rounded-lg border border-slate-200 bg-white", loading && "opacity-60")}>
                            <table className="w-full min-w-200 text-left text-[12px]">
                                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-[#62666F]">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold">Email / phone</th>
                                        <th className="px-4 py-2.5 font-semibold">Limit</th>
                                        <th className="px-4 py-2.5 font-semibold">Status</th>
                                        <th className="px-4 py-2.5 font-semibold">Codes sent</th>
                                        <th className="px-4 py-2.5 font-semibold">Resets on its own</th>
                                        <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((entry) => {
                                        const info = KINDS[entry.kind]
                                        const key = rowKey(entry)
                                        return (
                                            <tr key={key} className="border-b border-slate-100 align-top last:border-0">
                                                <td className="max-w-72 px-4 py-3">
                                                    <p className="truncate font-mono text-[12px] text-slate-900" title={entry.subject}>
                                                        {entry.subject}
                                                    </p>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <StatusPill tone={info.tone}>{info.label}</StatusPill>
                                                    <p className="mt-1 text-[11px] text-[#8A8D94]">{info.per}</p>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    {entry.limited ? (
                                                        <StatusPill tone="red">At the limit</StatusPill>
                                                    ) : (
                                                        <StatusPill tone="green">Under the limit</StatusPill>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {/* refused requests are counted too, so the count can pass the max */}
                                                    <CountBar value={entry.count} max={entry.max} />
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <Countdown
                                                        until={expiresAt(fetchedAt, entry.expiresInMs)}
                                                        now={now}
                                                        caption="count resets"
                                                        never={entry.limited ? "Never — reset by hand" : "—"}
                                                    />
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-8 gap-1.5 bg-white text-[11px]"
                                                        onClick={() => handleReset(entry)}
                                                        disabled={resetting === key || resettingAll}
                                                    >
                                                        {resetting === key ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                        )}
                                                        Reset
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <ConfirmResetAll
                open={confirmAll}
                busy={resettingAll}
                title="Reset every OTP limit?"
                description={`${
                    limitedCount
                        ? `${limitedCount} email${limitedCount === 1 ? "" : "s"} / phone number${limitedCount === 1 ? "" : "s"} at the limit can get codes again straight away`
                        : "Nobody is at the limit right now"
                }, and every email and SMS code count goes back to zero. Codes already sent stay valid.`}
                confirmLabel="Reset all"
                busyLabel="Resetting…"
                onCancel={() => setConfirmAll(false)}
                onConfirm={handleResetAll}
            />
        </div>
    )
}
