// =====================================================================
// Auction time zones.
//
// Auctions are stored as absolute UTC instants. The admin types dates and
// times as wall-clock values in the auction's own time zone (the "Time Zone"
// field), never the admin computer's zone — so the same form gives the same
// instant on any machine. Everyone else sees those instants in their own
// local time (VIEWER_TIME_ZONE).
// =====================================================================

export const DEFAULT_AUCTION_TIMEZONE = "Asia/Kolkata"

export const AUCTION_TIMEZONES: { value: string; label: string }[] = [
    { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
    { value: "Asia/Dubai", label: "Asia/Dubai (UTC+4)" },
    { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8)" },
    { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (UTC+8)" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9)" },
    { value: "Australia/Sydney", label: "Australia/Sydney" },
    { value: "Europe/London", label: "Europe/London" },
    { value: "Europe/Paris", label: "Europe/Paris" },
    { value: "America/New_York", label: "America/New_York" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles" },
    { value: "UTC", label: "UTC" },
]

/** The viewer's own zone, e.g. "Asia/Kolkata" in India. Browser-only meaningful. */
export const VIEWER_TIME_ZONE = (() => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch {
        return "UTC"
    }
})()

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Wall-clock parts formatter for a zone; an unknown zone name falls back to the default. */
const partsFormatter = (timeZone: string): Intl.DateTimeFormat => {
    let formatter = formatters.get(timeZone)
    if (!formatter) {
        try {
            formatter = new Intl.DateTimeFormat("en-US", {
                timeZone,
                hourCycle: "h23",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })
        } catch {
            formatter = partsFormatter(DEFAULT_AUCTION_TIMEZONE)
        }
        formatters.set(timeZone, formatter)
    }
    return formatter
}

const wallClock = (instant: number, timeZone: string) => {
    const map = Object.fromEntries(partsFormatter(timeZone).formatToParts(instant).map((p) => [p.type, p.value]))
    return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour) % 24, // some engines print midnight as "24"
        minute: Number(map.minute),
        second: Number(map.second),
    }
}

/** How far the zone's wall clock is ahead of UTC at that instant, in ms (IST -> +5:30). */
const zoneOffsetMs = (instant: number, timeZone: string) => {
    const w = wallClock(instant, timeZone)
    const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
    return wallAsUtc - (instant - (((instant % 1000) + 1000) % 1000))
}

/**
 * "2026-10-12" + "10:00" (or "23:59:59.999") as wall time in `timeZone` -> ISO UTC string.
 * Returns "" if either part is missing or malformed.
 */
export const zonedTimeToIso = (date: string, time: string, timeZone: string): string => {
    const d = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const t = time?.match(/^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/)
    if (!d || !t) return ""

    const wallAsUtc = Date.UTC(
        Number(d[1]),
        Number(d[2]) - 1,
        Number(d[3]),
        Number(t[1]),
        Number(t[2]),
        Number(t[3] ?? 0),
        Number((t[4] ?? "0").padEnd(3, "0"))
    )
    if (Number.isNaN(wallAsUtc)) return ""

    const zone = timeZone || DEFAULT_AUCTION_TIMEZONE
    // Offset at the first guess, then again at the result in case a DST change sits in between
    const guess = wallAsUtc - zoneOffsetMs(wallAsUtc, zone)
    return new Date(wallAsUtc - zoneOffsetMs(guess, zone)).toISOString()
}

/** ISO instant -> { date: "yyyy-MM-dd", time: "HH:mm" } as wall time in `timeZone`. */
export const isoToZonedParts = (iso: string | null | undefined, timeZone: string) => {
    if (!iso) return { date: "", time: "" }
    const instant = new Date(iso).getTime()
    if (Number.isNaN(instant)) return { date: "", time: "" }

    const w = wallClock(instant, timeZone || DEFAULT_AUCTION_TIMEZONE)
    const pad = (n: number, len = 2) => String(n).padStart(len, "0")
    return {
        date: `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}`,
        time: `${pad(w.hour)}:${pad(w.minute)}`,
    }
}

/** Today's date in `timeZone`, as "yyyy-MM-dd". */
export const todayInZone = (timeZone: string, now = Date.now()) =>
    isoToZonedParts(new Date(now).toISOString(), timeZone).date
