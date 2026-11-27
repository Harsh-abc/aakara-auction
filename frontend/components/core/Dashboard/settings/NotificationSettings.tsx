"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Loader2, LockIcon, MailIcon, MessageSquareIcon, type LucideIcon } from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import type {
    NotificationChannel,
    NotificationChannelSetting,
    NotificationSettingKey,
    NotificationSettings as Settings,
    NotificationSwitch,
} from "@/lib/types/notificationSetting.types"
import { cn } from "@/lib/utils"
import { getNotificationSettings, setNotificationSetting } from "@/services/operations/notificationSetting.api"

import { DASHBOARD_TIME_ZONE, PanelMessage, StatusPill } from "../home/dashboardUi"

const CHANNEL_ORDER: NotificationChannel[] = ["EMAIL", "SMS"]
const CHANNEL_ICONS: Record<NotificationChannel, LucideIcon> = { EMAIL: MailIcon, SMS: MessageSquareIcon }

const changedFmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DASHBOARD_TIME_ZONE,
})

const lastChanged = (s: NotificationSwitch) =>
    s.updatedAt ? `Changed ${changedFmt.format(new Date(s.updatedAt))}${s.updatedBy ? ` by ${s.updatedBy}` : ""}` : "On by default"

/**
 * Settings → Notifications: pause or resume the emails and SMS users get for their
 * activity (proxy bids, lots won, registration). A message goes out only when both its
 * own switch and its channel's switch are on. Super admin only.
 */
export function NotificationSettings() {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [settings, setSettings] = useState<Settings | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState<NotificationSettingKey | null>(null)
    // pausing a whole channel is confirmed first — it stops every message on it
    const [confirmPause, setConfirmPause] = useState<NotificationChannelSetting | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getNotificationSettings(token)
            .then((data) => {
                if (!cancelled) setSettings(data)
            })
            .catch((err) => {
                if (!cancelled) setError(getErrorMessage(err))
            })
        return () => {
            cancelled = true
        }
    }, [token])

    const save = async (key: NotificationSettingKey, enabled: boolean) => {
        setSaving(key)
        try {
            const { message, settings: next } = await setNotificationSetting(token, key, enabled)
            setSettings(next)
            toast.success(message)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setSaving(null)
        }
    }

    if (!settings) {
        return (
            <PanelMessage>
                {error ?? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading notification settings…
                    </>
                )}
            </PanelMessage>
        )
    }

    const channels = CHANNEL_ORDER.map((c) => settings.channels.find((s) => s.channel === c)).filter(
        (s): s is NotificationChannelSetting => !!s
    )
    const channelOn = (channel: NotificationChannel) => channels.find((c) => c.channel === channel)?.enabled ?? true

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0 space-y-6">
                {/* ───────── CHANNELS ───────── */}
                <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                    <div className="mb-3">
                        <h2 className="text-[15px] font-semibold text-slate-900">Email &amp; SMS</h2>
                        <p className="text-[12px] text-[#62666F]">
                            The master switches. Pausing one stops every notification on it for all users, whatever the switches below say.
                            Turn it back on and users get their notifications again from then on — messages skipped while paused aren&apos;t sent
                            later.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {channels.map((c) => {
                            const Icon = CHANNEL_ICONS[c.channel]
                            const id = `notify-channel-${c.channel}`
                            return (
                                <div
                                    key={c.channel}
                                    className={cn(
                                        "flex items-center gap-4 rounded-lg border bg-white px-4 py-4",
                                        c.enabled ? "border-slate-200" : "border-[#C93B3B]/30"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "flex size-10 shrink-0 items-center justify-center rounded-lg",
                                            c.enabled ? "bg-[#F6E9EF] text-[#7B2D52]" : "bg-[#FDECEC] text-[#C93B3B]"
                                        )}
                                    >
                                        <Icon className="size-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <label htmlFor={id} className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">
                                            {c.label === "SMS" ? "All SMS" : "All emails"}
                                            <StatusPill tone={c.enabled ? "green" : "red"}>{c.enabled ? "Sending" : "Paused"}</StatusPill>
                                        </label>
                                        <p className="mt-0.5 truncate text-[11px] text-[#8A8D94]">{lastChanged(c)}</p>
                                    </div>
                                    {saving === c.channel ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    ) : (
                                        <Switch
                                            id={id}
                                            checked={c.enabled}
                                            disabled={saving !== null}
                                            onCheckedChange={(checked) => (checked ? save(c.channel, true) : setConfirmPause(c))}
                                            aria-label={`${c.label} notifications`}
                                            className="data-checked:bg-[#7B2D52]"
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* ───────── PER ACTIVITY ───────── */}
                <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
                    <div className="mb-3">
                        <h2 className="text-[15px] font-semibold text-slate-900">By activity</h2>
                        <p className="text-[12px] text-[#62666F]">
                            What each user gets when they do something. Switch off one message without touching the rest.
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {/* header — the switch columns (hidden on phones, where each row labels its own switches) */}
                        <div className="hidden grid-cols-[1fr_110px_110px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#8A8D94] sm:grid">
                            <span>Notification</span>
                            {CHANNEL_ORDER.map((c) => (
                                <span key={c} className="text-center">
                                    {c === "SMS" ? "SMS" : "Email"}
                                </span>
                            ))}
                        </div>

                        <div className="divide-y divide-slate-100">
                            {settings.events.map((e) => (
                                <div key={e.event} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_110px_110px] sm:items-center sm:gap-4">
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-900">{e.label}</p>
                                        <p className="text-[11px] text-[#8A8D94]">{e.description}</p>
                                    </div>
                                    {CHANNEL_ORDER.map((channel) => (
                                        <EventSwitch
                                            key={channel}
                                            eventLabel={e.label}
                                            channel={channel}
                                            setting={e.channels[channel]}
                                            channelOn={channelOn(channel)}
                                            saving={saving}
                                            onChange={(enabled) => save(`${e.event}:${channel}`, enabled)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* ───────── ALWAYS SENT ───────── */}
            <aside className="space-y-4 lg:sticky lg:top-6">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#8A8D94]">
                        <LockIcon className="size-3.5" /> Always sent
                    </p>
                    <p className="mt-2 text-[12px] text-[#62666F]">
                        Security and account messages aren&apos;t affected by these switches — pausing them would stop people signing up or
                        getting back into their account.
                    </p>
                    <ul className="mt-3 space-y-2 text-[13px] text-slate-800">
                        {settings.alwaysSent.map((item) => (
                            <li key={item} className="flex gap-2">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#b08d57]" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="rounded-xl border border-[#b08d57]/30 bg-[#b08d57]/5 p-5 text-[12px] text-[#62666F]">
                    <p className="text-[13px] font-medium text-slate-900">In the browser</p>
                    <p className="mt-1">
                        Bidders signed in on the site still see a lot won on screen. These switches only stop the email and SMS.
                    </p>
                </div>
            </aside>

            <AlertDialog
                open={!!confirmPause}
                onOpenChange={(open) => {
                    if (!open) setConfirmPause(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pause {confirmPause?.label === "SMS" ? "all SMS" : "all emails"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            No user will get a {confirmPause?.label === "SMS" ? "text message" : "email"} for proxy bids, lots won or their
                            registration until you turn it back on. Messages skipped while it&apos;s paused aren&apos;t sent later. Sign-up and
                            password-reset codes still go out.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (confirmPause) save(confirmPause.channel, false)
                                setConfirmPause(null)
                            }}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Pause {confirmPause?.label === "SMS" ? "SMS" : "emails"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function EventSwitch({
    eventLabel,
    channel,
    setting,
    channelOn,
    saving,
    onChange,
}: {
    eventLabel: string
    channel: NotificationChannel
    setting: NotificationSwitch | undefined
    channelOn: boolean
    saving: NotificationSettingKey | null
    onChange: (enabled: boolean) => void
}) {
    const channelLabel = channel === "SMS" ? "SMS" : "Email"

    // this notification isn't sent on this channel at all
    if (!setting) {
        return (
            <div className="flex items-center justify-between sm:justify-center">
                <span className="text-[12px] text-[#8A8D94] sm:hidden">{channelLabel}</span>
                <span className="text-[12px] text-slate-300" title={`Not sent by ${channelLabel.toLowerCase()}`}>
                    —
                </span>
            </div>
        )
    }

    // on, but held back by the channel's master switch
    const heldBack = setting.enabled && !channelOn
    return (
        <div className="flex items-center justify-between gap-2 sm:flex-col sm:justify-center sm:gap-1">
            <span className="text-[12px] text-[#62666F] sm:hidden">{channelLabel}</span>
            <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                <Switch
                    checked={setting.enabled}
                    disabled={saving !== null}
                    onCheckedChange={onChange}
                    aria-label={`${eventLabel} ${channelLabel.toLowerCase()}`}
                    title={lastChanged(setting)}
                    className={cn("data-checked:bg-[#7B2D52]", heldBack && "opacity-50")}
                />
                <span className={cn("text-[10px]", !setting.enabled || heldBack ? "text-[#C93B3B]" : "text-[#8A8D94]")}>
                    {!setting.enabled ? "Paused" : heldBack ? `All ${channel === "SMS" ? "SMS" : "emails"} paused` : "On"}
                </span>
            </div>
        </div>
    )
}
