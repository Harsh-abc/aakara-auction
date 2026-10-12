"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { useAppSelector } from "@/hooks/redux"
import { cn } from "@/lib/utils"
import { getOnAirStreams, type OnAirStreams } from "@/services/operations/liveStream.api"

import { HOST_ROLES, ON_AIR_CHANGED_EVENT } from "./liveStudio.constants"

// how often the navbar checks whether a stream is on air
const POLL_MS = 30_000

// YouTube's "Create" camera icon
export function GoLiveIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn("size-5", className)}>
            <path d="M14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2zm3-2.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM15 16H5V8h10v8z" />
        </svg>
    )
}

// navbar: opens the studio; shows LIVE while any auction is being streamed
export function GoLiveButton() {
    const token = useAppSelector((state) => state.auth.accessToken)
    const role = useAppSelector((state) => state.auth.role)
    const canHost = Boolean(role && HOST_ROLES.includes(role))
    const [onAir, setOnAir] = useState<OnAirStreams["auctions"]>([])

    useEffect(() => {
        if (!canHost || !token) return
        let cancelled = false
        const load = () =>
            getOnAirStreams(token)
                .then((data) => !cancelled && setOnAir(data.auctions))
                .catch(() => {})
        load()
        const timer = setInterval(load, POLL_MS)
        // the studio announces when it goes on / off air
        window.addEventListener(ON_AIR_CHANGED_EVENT, load)
        return () => {
            cancelled = true
            clearInterval(timer)
            window.removeEventListener(ON_AIR_CHANGED_EVENT, load)
        }
    }, [canHost, token])

    if (!canHost) return null

    const live = onAir[0]
    const viewers = onAir.reduce((total, auction) => total + auction.viewers, 0)
    const href = live ? `/dashboard/go-live?auction=${live.uuid}` : "/dashboard/go-live"

    return (
        <Link
            href={href}
            title={live ? `Live: ${live.title}` : "Go live"}
            className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                live && "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-700"
            )}
        >
            {live ? (
                <>
                    <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-red-600" />
                    </span>
                    <span className="font-semibold tracking-wide">LIVE</span>
                    <span className="hidden text-red-600/80 sm:inline">· {viewers} watching</span>
                </>
            ) : (
                <>
                    <GoLiveIcon className="size-4.5" />
                    <span className="hidden sm:inline">Go live</span>
                </>
            )}
        </Link>
    )
}

