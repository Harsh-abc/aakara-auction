"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import { getBidDelay, getStreamLevel, refreshBidDelay, reportServerClock, subscribeNetworkHealth, type NetLevel } from "@/lib/networkHealth"
import { getSocket } from "@/lib/socket"

// a tiny round trip to the socket server — how long a bid takes to get there and back
const PING_EVERY_MS = 10_000
const PING_TIMEOUT_MS = 5_000
// slower than this and bids feel late in a fast room
const SLOW_RTT_MS = 800
// bids reaching the page (or the page's own bids going through) this late — the room has moved on
const SLOW_BID_MS = 2_000
// the browser's own download estimate (Chrome / Edge / Android) — below this the video can't stay smooth
const SLOW_DOWNLINK_MBPS = 1.5
// a weak spell must last this long before the banner shows, and a good one this long before it goes,
// so a single slow moment doesn't flash it on and off
const SHOW_AFTER_MS = 6_000
const HIDE_AFTER_MS = 15_000
// back online — say so quickly
const BACK_ONLINE_MS = 2_000

/** what's weak, for the message: late bids, a struggling stream, or the connection in general */
export type NetReason = "bids" | "video" | "connection"

export type NetworkHealth = {
    level: NetLevel
    reason: NetReason
    /** how late bids are, in ms, when that's known */
    bidDelayMs: number | null
}

type NetworkInformation = EventTarget & { effectiveType?: string; downlink?: number }
const connectionInfo = () => (navigator as Navigator & { connection?: NetworkInformation }).connection

function slowDownlink() {
    const info = connectionInfo()
    if (!info) return false
    if (info.effectiveType === "slow-2g" || info.effectiveType === "2g") return true
    // 0 means "unknown" on some browsers
    return typeof info.downlink === "number" && info.downlink > 0 && info.downlink < SLOW_DOWNLINK_MBPS
}

const subscribeDownlink = (onChange: () => void) => {
    const info = connectionInfo()
    info?.addEventListener("change", onChange)
    return () => info?.removeEventListener("change", onChange)
}

const subscribeOnline = (onChange: () => void) => {
    window.addEventListener("online", onChange)
    window.addEventListener("offline", onChange)
    return () => {
        window.removeEventListener("online", onChange)
        window.removeEventListener("offline", onChange)
    }
}

const subscribeSocket = (onChange: () => void) => {
    const socket = getSocket()
    socket.on("connect", onChange)
    socket.on("disconnect", onChange)
    return () => {
        socket.off("connect", onChange)
        socket.off("disconnect", onChange)
    }
}

/**
 * Whether this tab's connection is good enough for a live auction.
 * `upload`: the auctioneer — the browser's estimate is for download only, so it's left out and
 * LiveKit's view of the stream (which covers upload) decides.
 */
export function useNetworkHealth({ upload = false } = {}): NetworkHealth {
    const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
    const socketUp = useSyncExternalStore(subscribeSocket, () => getSocket().connected, () => true)
    const stream = useSyncExternalStore(subscribeNetworkHealth, getStreamLevel, () => null)
    const bidDelay = useSyncExternalStore(subscribeNetworkHealth, getBidDelay, () => null)
    const downlinkSlow = useSyncExternalStore(subscribeDownlink, slowDownlink, () => false)
    const [rtt, setRtt] = useState<number | null>(null)

    useEffect(() => {
        const socket = getSocket()
        let samples: number[] = []
        const ping = () => {
            // old bid samples age out even when no new bids come in
            refreshBidDelay()
            if (!socket.connected || document.visibilityState !== "visible") return
            const start = performance.now()
            const sentAt = Date.now()
            socket.timeout(PING_TIMEOUT_MS).emit("net:ping", {}, (error: Error | null, reply?: { now?: number }) => {
                if (!error && typeof reply?.now === "number") reportServerClock(reply.now, sentAt, Date.now())
                // the median of the last three, so one slow reply doesn't count as a weak connection
                samples = [...samples, error ? PING_TIMEOUT_MS : performance.now() - start].slice(-3)
                setRtt([...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)])
            })
        }
        const reset = () => {
            samples = []
            setRtt(null)
        }
        const timer = window.setInterval(ping, PING_EVERY_MS)
        socket.on("connect", ping)
        socket.on("disconnect", reset)
        ping()
        return () => {
            window.clearInterval(timer)
            socket.off("connect", ping)
            socket.off("disconnect", reset)
        }
    }, [])

    const bidsLate = bidDelay !== null && bidDelay >= SLOW_BID_MS
    const videoWeak = stream === "poor" || (!upload && downlinkSlow)
    const weak = bidsLate || videoWeak || !socketUp || (rtt !== null && rtt >= SLOW_RTT_MS)
    const raw: NetLevel = !online ? "offline" : weak ? "poor" : "good"
    const reason: NetReason = bidsLate ? "bids" : videoWeak ? "video" : "connection"

    const [shown, setShown] = useState<NetLevel>("good")
    useEffect(() => {
        if (raw === shown) return
        const delay = raw === "offline" ? 0 : shown === "offline" ? BACK_ONLINE_MS : raw === "good" ? HIDE_AFTER_MS : SHOW_AFTER_MS
        const timer = window.setTimeout(() => setShown(raw), delay)
        return () => window.clearTimeout(timer)
    }, [raw, shown])

    return { level: shown, reason, bidDelayMs: bidsLate ? bidDelay : null }
}
