"use client"

import { useEffect, useState } from "react"
import { ConnectionQuality } from "livekit-client"

import { cn } from "@/lib/utils"

// mm:ss (h:mm:ss past an hour) since the stream went on air
export function useLiveTimer(live: boolean) {
    const [seconds, setSeconds] = useState(0)

    useEffect(() => {
        if (!live) return
        const start = Date.now()
        const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000)
        return () => {
            clearInterval(timer)
            setSeconds(0)
        }
    }, [live])

    const s = live ? seconds : 0
    const h = Math.floor(s / 3600)
    const mm = String(Math.floor(s / 60) % 60).padStart(2, "0")
    const ss = String(s % 60).padStart(2, "0")
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// what the camera / screen really delivers (cameras may cap below the chosen fps)
export function useActualFps(track?: MediaStreamTrack) {
    const [fps, setFps] = useState<number>()
    useEffect(() => {
        if (!track) return
        const read = () => setFps(Math.round(track.getSettings().frameRate ?? 0) || undefined)
        const timer = setInterval(read, 2000)
        const first = setTimeout(read, 0)
        return () => {
            clearInterval(timer)
            clearTimeout(first)
        }
    }, [track])
    return track ? fps : undefined
}

export const initials = (name: string) =>
    name
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

export function ago(date?: Date) {
    if (!date) return ""
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`
}

// "Chrome · Windows" from the user agent the viewer token carries
export function device(metadata?: string) {
    try {
        const ua: string = JSON.parse(metadata ?? "{}").ua ?? ""
        const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : ""
        const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : ""
        return [browser, os].filter(Boolean).join(" · ") || "Browser"
    } catch {
        return "Browser"
    }
}

const QUALITY: Record<string, [string, string]> = {
    [ConnectionQuality.Excellent]: ["bg-emerald-500", "Excellent connection"],
    [ConnectionQuality.Good]: ["bg-lime-500", "Good connection"],
    [ConnectionQuality.Poor]: ["bg-red-500", "Poor connection"],
    [ConnectionQuality.Lost]: ["bg-slate-400", "Connection lost"],
}

export function QualityDot({ quality }: { quality: ConnectionQuality }) {
    const [color, label] = QUALITY[quality] ?? ["bg-slate-400", "Unknown connection"]
    return <span className={cn("inline-block size-1.5 shrink-0 rounded-full", color)} title={label} />
}
