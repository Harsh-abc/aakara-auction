"use client"

import { useCallback, useEffect, useState } from "react"

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
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import { cn } from "@/lib/utils"

// shared by Settings → Blocked IPs and Settings → OTP Limits: lists of Redis
// keys that expire on their own, with countdowns and a reset button

// blocks last minutes, so keep the list fresh while the page is open
const AUTO_REFRESH_MS = 30_000

// ---------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------

/** "4m 05s", "1h 2m", "12s" */
export const formatLeft = (ms: number) => {
    const total = Math.max(0, Math.ceil(ms / 1000))
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    if (hours) return `${hours}h ${minutes}m`
    if (minutes) return `${minutes}m ${String(seconds).padStart(2, "0")}s`
    return `${seconds}s`
}

/** 900 → "15 min", 3600 → "1 hour" */
export const formatSpan = (seconds: number) =>
    seconds === 3600 ? "1 hour" : seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds}s`

export const timeAgo = (iso: string, now: number) => {
    const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
    if (seconds < 60) return "just now"
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.round(minutes / 60)}h ago`
}

// the server sends time left on each key; pin it to when the list arrived
export const expiresAt = (fetchedAt: number, ms: number | null) => (ms === null ? null : fetchedAt + ms)

// ---------------------------------------------------------------------
// data
// ---------------------------------------------------------------------

/**
 * Loads a list (super admins only), reloads it every 30s and as soon as one of
 * its keys runs out, and ticks `now` every second for the countdowns.
 * `load` and `expiries` must be stable (module-level) functions.
 */
export function useExpiringList<T>(
    load: (token: string | null) => Promise<T>,
    expiries: (data: T) => (number | null)[],
    enabled: boolean
) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const [refresh, setRefresh] = useState(0)
    const [list, setList] = useState<{ key: number; data: T | null; fetchedAt: number; error: string | null } | null>(null)
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        if (!token || !enabled) return
        let cancelled = false
        load(token)
            .then((data) => {
                if (!cancelled) setList({ key: refresh, data, fetchedAt: Date.now(), error: null })
            })
            .catch((err) => {
                // keep the last good list on screen
                if (!cancelled)
                    setList((prev) => ({
                        key: refresh,
                        data: prev?.data ?? null,
                        fetchedAt: prev?.fetchedAt ?? Date.now(),
                        error: getErrorMessage(err),
                    }))
            })
        return () => {
            cancelled = true
        }
    }, [token, enabled, refresh, load])

    useEffect(() => {
        if (!enabled) return
        const id = setInterval(() => setRefresh((n) => n + 1), AUTO_REFRESH_MS)
        return () => clearInterval(id)
    }, [enabled])

    const data = list?.data ?? null
    const fetchedAt = list?.fetchedAt ?? 0
    useEffect(() => {
        if (!data) return
        const times = expiries(data).map((ms) => expiresAt(fetchedAt, ms) ?? Infinity)
        if (!times.length) return
        const tick = setInterval(() => setNow(Date.now()), 1000)
        const next = Math.min(...times)
        const reload = Number.isFinite(next) ? setTimeout(() => setRefresh((n) => n + 1), Math.max(0, next - Date.now()) + 500) : null
        return () => {
            clearInterval(tick)
            if (reload) clearTimeout(reload)
        }
    }, [data, fetchedAt, expiries])

    const reload = useCallback(() => setRefresh((n) => n + 1), [])
    /** change the list on screen right away (after a reset), before the reload lands */
    const update = useCallback((change: (data: T) => T) => setList((prev) => (prev?.data ? { ...prev, data: change(prev.data) } : prev)), [])

    return { token, data, error: list?.error ?? null, loading: list?.key !== refresh, fetchedAt, now, reload, update }
}

// ---------------------------------------------------------------------
// small pieces
// ---------------------------------------------------------------------

/** "18 / 20" over a bar that turns amber at half and red at the limit */
export function CountBar({ value, max }: { value: number; max: number }) {
    const share = Math.min(1, value / max)
    return (
        <div className="w-28">
            <p className="text-[12px] font-semibold text-slate-900">
                {value} <span className="font-normal text-[#8A8D94]">/ {max}</span>
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={cn("h-full rounded-full", share >= 1 ? "bg-[#C93B3B]" : share >= 0.5 ? "bg-[#D9932B]" : "bg-[#7B2D52]")}
                    style={{ width: `${share * 100}%` }}
                />
            </div>
        </div>
    )
}

/** Time left on a key, or "now" once it has run out */
export function Countdown({ until, now, caption, never }: { until: number | null; now: number; caption: string; never: string }) {
    return (
        <>
            {until === null ? (
                <p className="text-slate-900">{never}</p>
            ) : (
                <p className="font-mono text-slate-900">{until <= now ? "now" : formatLeft(until - now)}</p>
            )}
            <p className="text-[11px] text-[#8A8D94]">{caption}</p>
        </>
    )
}

export function ConfirmResetAll({
    open,
    busy,
    title,
    description,
    confirmLabel,
    busyLabel,
    onCancel,
    onConfirm,
}: {
    open: boolean
    busy: boolean
    title: string
    description: string
    confirmLabel: string
    busyLabel: string
    onCancel: () => void
    onConfirm: () => void
}) {
    return (
        <AlertDialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel()
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={busy} className="bg-red-600 text-white hover:bg-red-700">
                        {busy ? busyLabel : confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
