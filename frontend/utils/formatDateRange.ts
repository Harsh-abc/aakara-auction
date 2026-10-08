// "12–14 September 2026", "28 September – 2 October 2026", or full dates across years,
// in the auction's own timezone
export function formatDateRange(startIso: string, endIso: string, timeZone: string) {
    const start = new Date(startIso)
    const end = new Date(endIso)

    const parts = (date: Date) => {
        let formatter: Intl.DateTimeFormat
        try {
            formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone })
        } catch {
            // unknown timezone name — fall back to the viewer's
            formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" })
        }
        const map = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]))
        return { day: map.day, month: map.month, year: map.year }
    }

    const s = parts(start)
    const e = parts(end)

    if (s.year !== e.year) return `${s.day} ${s.month} ${s.year} – ${e.day} ${e.month} ${e.year}`
    if (s.month !== e.month) return `${s.day} ${s.month} – ${e.day} ${e.month} ${e.year}`
    if (s.day !== e.day) return `${s.day}–${e.day} ${s.month} ${s.year}`
    return `${s.day} ${s.month} ${s.year}`
}
