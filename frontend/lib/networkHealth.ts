// How healthy this tab's connection looks, from signals the app already has — no speed test
// (downloading megabytes to measure would itself slow a weak connection mid-auction).

export type NetLevel = "good" | "poor" | "offline"

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

export function subscribeNetworkHealth(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

// ---------------------------------------------------------------------
// Stream: LiveKit's view of this tab (viewer: download, studio: upload) — null while not in a room
// ---------------------------------------------------------------------

let streamLevel: NetLevel | null = null

export function reportStreamLevel(level: NetLevel | null) {
    if (level === streamLevel) return
    streamLevel = level
    notify()
}

export const getStreamLevel = () => streamLevel

// ---------------------------------------------------------------------
// Bid delay: how late new bids reach this tab ("lot:update" sent → received), and how long
// this tab's own bids take to go through. The median of the recent ones, so one slow moment doesn't count.
// ---------------------------------------------------------------------

// only the last minute counts — an old slow spell says nothing about now
const BID_SAMPLE_MAX_AGE_MS = 60_000
const BID_SAMPLES = 3

let samples: { ms: number; at: number }[] = []
let bidDelay: number | null = null

function updateBidDelay() {
    const now = Date.now()
    samples = samples.filter((sample) => now - sample.at < BID_SAMPLE_MAX_AGE_MS).slice(-BID_SAMPLES)
    // one sample isn't enough to judge by
    const next = samples.length < 2 ? null : [...samples].map((s) => s.ms).sort((a, b) => a - b)[Math.floor(samples.length / 2)]
    if (next === bidDelay) return
    bidDelay = next
    notify()
}

function addBidSample(ms: number) {
    // a background tab handles events late on purpose (the browser throttles it) — not the network's fault
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return
    samples.push({ ms: Math.max(0, ms), at: Date.now() })
    updateBidDelay()
}

export const getBidDelay = () => bidDelay

/** drops samples older than a minute (called on a timer, so a recovered connection clears) */
export const refreshBidDelay = updateBidDelay

/** how long one of this tab's bids took, sent → accepted or refused */
export const reportBidRoundTrip = (ms: number) => addBidSample(ms)

// the server's clock minus ours — from the "net:ping" reply with the shortest round trip (the most exact)
let clockOffset: number | null = null
let bestRtt = Infinity

export function reportServerClock(serverNow: number, sentAt: number, receivedAt: number) {
    const rtt = receivedAt - sentAt
    // a slow reply only blurs the estimate — keep the one from a quicker reply
    if (rtt > bestRtt * 1.5) return
    bestRtt = Math.min(bestRtt, rtt)
    clockOffset = serverNow - (sentAt + rtt / 2)
}

/** a server event stamped with its send time (ms, server clock) arrived */
export function reportServerEvent(sentAt: number | undefined) {
    if (typeof sentAt !== "number" || clockOffset === null) return
    addBidSample(Date.now() + clockOffset - sentAt)
}
