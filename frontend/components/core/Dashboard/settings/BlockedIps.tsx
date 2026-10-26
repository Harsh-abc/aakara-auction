"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Ban, Eye, Loader2, LockOpen, RefreshCw, Search, ShieldAlert, ShieldCheck, Timer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import type { IpBlock, IpBlockList } from "@/lib/types/ipBlock.types"
import { cn } from "@/lib/utils"
import { getIpBlocks, unblockAllIps, unblockIp } from "@/services/operations/ipBlock.api"

import { describeDevice, PanelMessage, Segmented, StatTile, StatusPill } from "../home/dashboardUi"
import { ConfirmResetAll, Countdown, CountBar, expiresAt, formatSpan, timeAgo, useExpiringList } from "./securityUi"

type StatusFilter = "all" | "blocked" | "watching"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "blocked", label: "Blocked" },
    { value: "watching", label: "Failed sign-ins" },
]

const keyExpiries = (data: IpBlockList) => data.ips.flatMap((e) => [e.blockExpiresInMs, e.failuresExpireInMs])

function EmailsCell({ entry }: { entry: IpBlock }) {
    if (!entry.emailCount) return <span className="text-[#8A8D94]">—</span>
    const more = entry.emailCount - entry.emails.length
    return (
        <div className="flex max-w-72 flex-wrap gap-1">
            {entry.emails.map((email) => (
                <span key={email} className="truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700" title={email}>
                    {email}
                </span>
            ))}
            {more > 0 && <span className="px-1 py-0.5 text-[11px] text-[#8A8D94]">+{more} more</span>}
        </div>
    )
}

// =====================================================================
// PAGE
// =====================================================================

export function BlockedIps() {
    const isSuperAdmin = useAppSelector((state) => state.auth.role) === "SUPER_ADMIN"
    const { token, data, error, loading, fetchedAt, now, reload, update } = useExpiringList(getIpBlocks, keyExpiries, isSuperAdmin)

    const [status, setStatus] = useState<StatusFilter>("all")
    const [searchInput, setSearchInput] = useState("")
    const [unblocking, setUnblocking] = useState<string | null>(null)
    const [confirmAll, setConfirmAll] = useState(false)
    const [unblockingAll, setUnblockingAll] = useState(false)

    if (!isSuperAdmin) {
        return (
            <PanelMessage>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Only super admins can manage blocked IP addresses.
            </PanelMessage>
        )
    }

    const entries = data?.ips ?? null
    const rules = data?.rules ?? null
    const blockedCount = entries?.filter((e) => e.blocked).length ?? null
    const watchingCount = entries ? entries.length - (blockedCount ?? 0) : null

    const search = searchInput.trim().toLowerCase()
    const shown = (entries ?? []).filter(
        (e) =>
            (status === "all" || (status === "blocked") === e.blocked) &&
            (!search || e.ip.toLowerCase().includes(search) || e.emails.some((email) => email.toLowerCase().includes(search)))
    )

    const handleUnblock = async (ip: string) => {
        setUnblocking(ip)
        try {
            toast.success(await unblockIp(token, ip))
            update((list) => ({ ...list, ips: list.ips.filter((e) => e.ip !== ip) }))
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setUnblocking(null)
            reload()
        }
    }

    const handleUnblockAll = async () => {
        setUnblockingAll(true)
        try {
            toast.success(await unblockAllIps(token))
            update((list) => ({ ...list, ips: [] }))
            setConfirmAll(false)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setUnblockingAll(false)
            reload()
        }
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatTile icon={<Ban className="h-4 w-4" />} label="Blocked right now" value={blockedCount} tone="red" />
                <StatTile icon={<Eye className="h-4 w-4" />} label="IPs with failed sign-ins" value={watchingCount} />
                <StatTile
                    icon={<Timer className="h-4 w-4" />}
                    label="Block rule"
                    value={rules ? `${rules.threshold} fails → ${formatSpan(rules.blockSeconds)}` : null}
                    title={
                        rules
                            ? `${rules.threshold} failed sign-ins from one IP within ${formatSpan(rules.windowSeconds)} block it for ${formatSpan(rules.blockSeconds)}`
                            : undefined
                    }
                />
            </div>

            <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search IP address or email…"
                            className="h-10 bg-white pl-9 text-[13px]"
                        />
                    </div>
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
                            <LockOpen className="h-3.5 w-3.5" />
                            Unblock all
                        </Button>
                    </div>
                </div>

                {rules && (
                    <p className="mt-3 text-[12px] text-[#62666F]">
                        {rules.threshold} failed sign-ins from one IP address within {formatSpan(rules.windowSeconds)} block it for{" "}
                        {formatSpan(rules.blockSeconds)}. Unblocking also resets the failed sign-in count, so the IP signs in as usual.
                    </p>
                )}

                <div className="mt-4">
                    {!entries ? (
                        error ? (
                            <PanelMessage>{error}</PanelMessage>
                        ) : (
                            <PanelMessage>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading blocked IP addresses…
                            </PanelMessage>
                        )
                    ) : entries.length === 0 ? (
                        <PanelMessage>
                            <ShieldCheck className="mr-2 h-4 w-4 text-[#1F8A4C]" />
                            No blocked IP addresses and no recent failed sign-ins.
                        </PanelMessage>
                    ) : shown.length === 0 ? (
                        <PanelMessage>No IP addresses match these filters.</PanelMessage>
                    ) : (
                        <div className={cn("overflow-x-auto rounded-lg border border-slate-200 bg-white", loading && "opacity-60")}>
                            <table className="w-full min-w-240 text-left text-[12px]">
                                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-[#62666F]">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold">IP address</th>
                                        <th className="px-4 py-2.5 font-semibold">Status</th>
                                        <th className="px-4 py-2.5 font-semibold">Failed sign-ins</th>
                                        <th className="px-4 py-2.5 font-semibold">Clears on its own</th>
                                        <th className="px-4 py-2.5 font-semibold">Emails tried</th>
                                        <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((entry) => (
                                        <tr key={entry.ip} className="border-b border-slate-100 align-top last:border-0">
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <p className="font-mono text-[12px] text-slate-900">{entry.ip}</p>
                                                <p className="text-[11px] text-[#8A8D94]">{describeDevice(entry.userAgent) ?? ""}</p>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                {entry.blocked ? (
                                                    <StatusPill tone="red">Blocked</StatusPill>
                                                ) : (
                                                    <StatusPill tone="amber">Failed sign-ins</StatusPill>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <CountBar value={entry.failedAttempts} max={rules?.threshold ?? 1} />
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <Countdown
                                                    until={
                                                        entry.blocked
                                                            ? expiresAt(fetchedAt, entry.blockExpiresInMs)
                                                            : expiresAt(fetchedAt, entry.failuresExpireInMs)
                                                    }
                                                    now={now}
                                                    caption={entry.blocked ? "block ends" : "count resets"}
                                                    never={entry.blocked ? "Never — unblock by hand" : "—"}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <EmailsCell entry={entry} />
                                                {entry.lastAttemptAt && (
                                                    <p className="mt-1 text-[11px] text-[#8A8D94]">last try {timeAgo(entry.lastAttemptAt, now)}</p>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-8 gap-1.5 bg-white text-[11px]"
                                                    onClick={() => handleUnblock(entry.ip)}
                                                    disabled={unblocking === entry.ip || unblockingAll}
                                                >
                                                    {unblocking === entry.ip ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <LockOpen className="h-3.5 w-3.5" />
                                                    )}
                                                    {entry.blocked ? "Unblock" : "Reset count"}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <ConfirmResetAll
                open={confirmAll}
                busy={unblockingAll}
                title="Unblock every IP address?"
                description={`${
                    blockedCount
                        ? `${blockedCount} blocked IP address${blockedCount === 1 ? "" : "es"} can sign in again straight away`
                        : "Every IP address can keep signing in"
                }, and the failed sign-in count of every IP goes back to zero. Accounts locked by too many wrong passwords stay locked until their lock ends.`}
                confirmLabel="Unblock all"
                busyLabel="Unblocking…"
                onCancel={() => setConfirmAll(false)}
                onConfirm={handleUnblockAll}
            />
        </div>
    )
}
