"use client"

import { useEffect, useState } from "react"

import { onServerClockSync, serverNow } from "@/lib/serverClock"

/** Server-clock "now" (epoch ms), refreshed every `intervalMs` and as soon as the clock syncs. */
export function useServerNow(intervalMs: number) {
    const [now, setNow] = useState(() => serverNow())

    useEffect(() => {
        const update = () => setNow(serverNow())
        const id = window.setInterval(update, intervalMs)
        const stopSync = onServerClockSync(update)
        return () => {
            window.clearInterval(id)
            stopSync()
        }
    }, [intervalMs])

    return now
}
