import { useEffect } from "react"

// how long to keep the target in view while the page above it is still loading (hero, listings)
const SETTLE_MS = 4000

/**
 * Scrolls to `location.hash` (e.g. /#how-to-bid) once the page has mounted.
 *
 * The browser's own jump doesn't work here: the app renders nothing until redux-persist rehydrates,
 * so the target doesn't exist when the browser looks for it — and the hero / listings above it
 * grow after their data loads, which would push it out of place anyway. So: scroll after mount,
 * then keep the target aligned while the layout settles, until the user scrolls themselves.
 */
export function useScrollToHash() {
    useEffect(() => {
        let cleanup: (() => void) | undefined

        const follow = () => {
            cleanup?.()
            const id = decodeURIComponent(window.location.hash.slice(1))
            if (!id) return

            const align = () => document.getElementById(id)?.scrollIntoView({ block: "start" })
            align()

            // re-align whenever the page height changes (data arriving above the target)
            const observer = new ResizeObserver(align)
            observer.observe(document.body)

            const stop = () => {
                observer.disconnect()
                window.clearTimeout(timer)
                for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, stop)
            }
            const timer = window.setTimeout(stop, SETTLE_MS)
            // the user taking over wins — never fight their scrolling
            for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { passive: true })
            cleanup = stop
        }

        follow()
        window.addEventListener("hashchange", follow)
        return () => {
            window.removeEventListener("hashchange", follow)
            cleanup?.()
        }
    }, [])
}

const USER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"] as const
