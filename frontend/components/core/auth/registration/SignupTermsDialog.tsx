"use client"

import { useEffect, useRef, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TermsOfSaleDocument } from "@/components/core/frontend/auctions/TermsOfSaleDocument"
import { TERMS_OF_SALE } from "@/lib/constants/termsOfSale"

/** px from the bottom that still counts as having scrolled to the end (sub-pixel rounding, zoom) */
const SCROLL_END_TOLERANCE = 16

type SignupTermsDialogProps = {
    open: boolean
    onAccept: () => void
    /** "Decline", the close button or Escape */
    onDecline: () => void
}

// The sign-up checkbox opens this: the full Terms and Conditions, and "Accept" only once they've been scrolled to the end
export function SignupTermsDialog({ open, onAccept, onDecline }: SignupTermsDialogProps) {
    const [readToEnd, setReadToEnd] = useState(false)
    const termsRef = useRef<HTMLDivElement>(null)

    const markReadIfAtEnd = (el: HTMLElement) => {
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_END_TOLERANCE) setReadToEnd(true)
    }

    // terms short enough to fit without scrolling count as read
    useEffect(() => {
        if (!open) return
        const frame = requestAnimationFrame(() => {
            if (termsRef.current) markReadIfAtEnd(termsRef.current)
        })
        return () => cancelAnimationFrame(frame)
    }, [open])

    // the terms are read fresh every time it opens
    const close = (accepted: boolean) => {
        setReadToEnd(false)
        if (accepted) onAccept()
        else onDecline()
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close(false)}>
            <DialogContent className="flex max-h-[90dvh] flex-col gap-0 rounded-none p-0 sm:max-w-2xl">
                <DialogHeader className="border-b border-neutral-200 p-6 pr-12">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Version {TERMS_OF_SALE.version}</p>
                    <DialogTitle className="text-xl font-light leading-snug text-neutral-950">Terms and conditions</DialogTitle>
                    <DialogDescription className="text-xs leading-relaxed  text-red-700">
                        Please read the terms to the end. You need to accept them to create an account.
                    </DialogDescription>
                </DialogHeader>

                <div
                    ref={termsRef}
                    onScroll={(e) => markReadIfAtEnd(e.currentTarget)}
                    tabIndex={0}
                    aria-label="Terms and conditions of sale"
                    className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 p-6 focus-visible:outline-1 focus-visible:outline-neutral-950"
                >
                    <TermsOfSaleDocument auctionTerms={null} />
                </div>

                <div className="flex flex-col gap-3 border-t border-neutral-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-red-700" aria-live="polite">
                        {readToEnd ? "You've reached the end of the terms." : "Scroll to the end of the terms to accept them."}
                    </p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => close(false)}
                            className="inline-flex h-11 cursor-pointer items-center justify-center border border-neutral-950 bg-white px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition-colors hover:bg-neutral-50"
                        >
                            Decline
                        </button>
                        <button
                            type="button"
                            onClick={() => close(true)}
                            disabled={!readToEnd}
                            className="inline-flex h-11 cursor-pointer items-center justify-center bg-neutral-950 px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors not-disabled:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
