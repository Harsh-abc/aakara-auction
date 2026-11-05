"use client"

import { useEffect } from "react"

/**
 * Deterrent against saving artwork images on the public site.
 * Blocks: right-click menu (Save image as / Open image in new tab / Copy image address / Inspect),
 * dragging images out of the page, and the usual save / view-source / DevTools keyboard shortcuts.
 *
 * NOTE: this only stops casual users. Anything the browser displays can still be captured
 * (screenshots, browser menu → Developer tools, disabling JS). Real protection for the original
 * files has to happen on the storage side (watermarking, low-res web copies, S3 referer policy).
 */

// right-click stays usable inside form fields so people can still paste into inputs
const isEditable = (el: EventTarget | null) =>
    el instanceof HTMLElement && (el.isContentEditable || !!el.closest("input, textarea, select, [contenteditable='true']"))

export function ContentProtection() {
    useEffect(() => {
        const onContextMenu = (e: MouseEvent) => {
            if (!isEditable(e.target)) e.preventDefault()
        }

        const onDragStart = (e: DragEvent) => {
            const t = e.target
            if (t instanceof HTMLImageElement || t instanceof HTMLPictureElement || t instanceof HTMLVideoElement) e.preventDefault()
        }

        const onKeyDown = (e: KeyboardEvent) => {
            // autofill (and some IMEs) fire keydown with no key — nothing to block there
            if (typeof e.key !== "string") return
            const key = e.key.toLowerCase()
            const mod = e.ctrlKey || e.metaKey // Ctrl on Windows/Linux, Cmd on macOS

            const blocked =
                key === "f12" ||
                // DevTools: Ctrl+Shift+I/J/C/K (Win) · Cmd+Option+I/J/C (mac)
                (mod && (e.shiftKey || e.altKey) && ["i", "j", "c", "k"].includes(key)) ||
                // view source (Ctrl+U / Cmd+Option+U) and save page (Ctrl+S)
                (mod && (key === "u" || key === "s"))

            if (blocked) {
                e.preventDefault()
                e.stopPropagation()
            }
        }

        // capture phase so page components can't swallow the event first
        document.addEventListener("contextmenu", onContextMenu, true)
        document.addEventListener("dragstart", onDragStart, true)
        window.addEventListener("keydown", onKeyDown, true)
        return () => {
            document.removeEventListener("contextmenu", onContextMenu, true)
            document.removeEventListener("dragstart", onDragStart, true)
            window.removeEventListener("keydown", onKeyDown, true)
        }
    }, [])

    return null
}
