"use client"

import { useSyncExternalStore, type ReactNode } from "react"

/**
 * The live video in our picture-in-picture window (Document PiP). While it's open the player lives in the
 * storefront layout (LivePipHost), not the live room page, so browsing the site doesn't close it.
 * The room shows a placeholder meanwhile — only one player is ever connected to LiveKit.
 */
export type LivePip = {
    auctionUuid: string
    /** the floating window */
    window: Window
    /** back to the live room */
    href: string
    /** shown until the auctioneer's video arrives (the lot image) */
    fallback: ReactNode
    muted: boolean
}

let current: LivePip | null = null
const listeners = new Set<() => void>()

// pages outside the storefront layout (the embed) have no host — they use the browser's video PiP instead
let hosts = 0
export function registerPipHost() {
    hosts += 1
    return () => {
        hosts -= 1
    }
}
export const hasPipHost = () => hosts > 0

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function useLivePip() {
    return useSyncExternalStore(
        subscribe,
        () => current,
        () => null
    )
}

export function openLivePip(pip: LivePip) {
    current = pip
    listeners.forEach((listener) => listener())
}

export function updateLivePip(patch: Partial<Pick<LivePip, "muted">>) {
    // kept in place, no re-render needed — only read when a player mounts
    if (current) Object.assign(current, patch)
}

export function clearLivePip() {
    if (!current) return
    current = null
    listeners.forEach((listener) => listener())
}

// the picture-in-picture window starts empty — give it the page's styles so the player looks the same
export function copyStyles(target: Document) {
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            const style = target.createElement("style")
            style.textContent = Array.from(sheet.cssRules)
                .map((rule) => rule.cssText)
                .join("\n")
            target.head.appendChild(style)
        } catch {
            // cross-origin sheet — link it instead
            if (!sheet.href) continue
            const link = target.createElement("link")
            link.rel = "stylesheet"
            link.href = sheet.href
            target.head.appendChild(link)
        }
    }
}
