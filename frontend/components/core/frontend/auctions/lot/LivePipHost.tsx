"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"

import { useAppSelector } from "@/hooks/redux"

import { LiveConnection } from "./LivePlayer"
import { clearLivePip, registerPipHost, updateLivePip, useLivePip } from "./livePip"

/**
 * Runs the live video inside the picture-in-picture window from the storefront layout, so it keeps playing
 * while the user moves between pages. Closing the window (or signing out) hands it back to the live room page.
 */
export function LivePipHost() {
    const pip = useLivePip()
    const signedIn = useAppSelector((state) => Boolean(state.auth.accessToken))
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => registerPipHost(), [])

    // the window was closed (× or "back to the room") — or this host goes away (left the storefront)
    useEffect(() => {
        if (!pip) return
        const win = pip.window
        win.addEventListener("pagehide", clearLivePip)
        return () => {
            win.removeEventListener("pagehide", clearLivePip)
            win.close()
        }
    }, [pip])
    useEffect(() => () => clearLivePip(), [])

    useEffect(() => {
        if (pip && !signedIn) pip.window.close()
    }, [pip, signedIn])

    if (!pip || !signedIn) return null

    const back = () => {
        if (pathname !== pip.href) router.push(pip.href)
        pip.window.close()
    }

    return createPortal(
        <div className="fixed inset-0 bg-black">
            <LiveConnection
                auctionUuid={pip.auctionUuid}
                fallback={pip.fallback}
                inPipWindow
                onBack={back}
                defaultMuted={pip.muted}
                onMutedChange={(muted) => updateLivePip({ muted })}
            />
        </div>,
        pip.window.document.body
    )
}
