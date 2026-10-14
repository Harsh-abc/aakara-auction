import { TIME_API } from "@/services/api"

// =====================================================================
// Server-synced clock.
//
// Auction times are absolute UTC instants, so "Live in" / "Ends in" only
// depends on how far away that instant is. Date.now() is the visitor's system
// clock, which can be off by minutes or hours (e.g. a PC set to the wrong
// timezone with its clock nudged to look right) — two machines then show
// different countdowns. We measure our offset from the server once and use
// serverNow() everywhere we compare against auction times.
// =====================================================================

const RESYNC_MS = 10 * 60 * 1000

let offsetMs = 0
let lastSyncAt = 0
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

async function sync() {
    const sentAt = Date.now()
    const res = await fetch(TIME_API, { cache: "no-store" })
    const receivedAt = Date.now()
    if (!res.ok) throw new Error(`time sync failed: ${res.status}`)

    const { now } = (await res.json()) as { now?: number }
    if (typeof now !== "number" || !Number.isFinite(now)) throw new Error("time sync: bad payload")

    // assume the server read its clock halfway through the round trip
    offsetMs = now - (sentAt + receivedAt) / 2
    lastSyncAt = receivedAt
    listeners.forEach((notify) => notify())
}

/** Starts (or refreshes) the sync in the background; safe to call often. */
export function syncServerClock() {
    if (typeof window === "undefined" || inFlight) return
    if (lastSyncAt && Date.now() - lastSyncAt < RESYNC_MS) return

    inFlight = sync()
        .catch((err) => console.warn("[serverClock]", err))
        .finally(() => {
            inFlight = null
        })
}

/** Current time in epoch ms per the server's clock (the local clock until the first sync lands). */
export function serverNow() {
    syncServerClock()
    return Date.now() + offsetMs
}

/** Called after each successful sync, so clocks that tick slowly can update straight away. */
export function onServerClockSync(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}
