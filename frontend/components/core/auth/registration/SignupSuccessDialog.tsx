"use client"

import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { BODY, BUTTON, BUTTON_SOLID, EYEBROW } from "@/components/core/frontend/storefront"
import { cn } from "@/lib/utils"

/** seconds before the popup closes by itself */
const AUTO_CLOSE_SECONDS = 10

type SignupSuccessDialogProps = {
    /** first name, for the greeting */
    name: string
    email: string
    /** they were logged in straight after signing up; if not, closing takes them to the login form */
    signedIn: boolean
    /** the X, "Continue", Escape, a click outside, or the countdown running out (called once) */
    onClose: () => void
}

// shown once the phone code is verified and the account exists; mounted only while it's showing
export function SignupSuccessDialog({ name, email, signedIn, onClose }: SignupSuccessDialogProps) {
    const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS)

    // the countdown and a click can land together; only the first one counts
    const closed = useRef(false)
    const close = () => {
        if (closed.current) return
        closed.current = true
        onClose()
    }

    // the bar starts full and is emptied a frame later, so the width change animates
    const [barRunning, setBarRunning] = useState(false)

    useEffect(() => {
        const frame = requestAnimationFrame(() => setBarRunning(true))
        const timer = setInterval(() => setSecondsLeft((s) => Math.max(s - 1, 0)), 1000)
        return () => {
            cancelAnimationFrame(frame)
            clearInterval(timer)
        }
    }, [])

    useEffect(() => {
        if (secondsLeft === 0) close()
        // close only reads a ref and the latest onClose
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secondsLeft])

    return (
        <Dialog open onOpenChange={(next) => !next && close()}>
            <DialogContent
                showCloseButton={false}
                className="gap-0 overflow-hidden rounded-none border border-[#333] bg-white p-0 ring-0 sm:max-w-[440px]"
            >
                <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center text-[#717171] transition-colors hover:bg-[#fdf1e3] hover:text-[#0d0d0d]"
                >
                    <X className="size-4" />
                </button>

                <div className="flex flex-col items-center px-6 pt-10 pb-7 text-center sm:px-8">
                    <span className="flex size-14 items-center justify-center rounded-full border border-[#cea25a] bg-[#fdf1e3] text-[#0d0d0d]">
                        <Check className="size-6" strokeWidth={1.5} />
                    </span>

                    <p className={cn(EYEBROW, "mt-6")}>Registration complete</p>
                    <DialogTitle className="mt-3 text-[26px] leading-tight font-medium tracking-tight text-[#0d0d0d]">
                        Thank you for registering{name ? `, ${name}` : ""}
                    </DialogTitle>

                    <DialogDescription className={cn(BODY, "mt-4")}>
                        Your Akara account has been created and your email address and mobile number are verified.
                        {signedIn ? " You're now logged in." : " Log in with your new password to continue."}
                    </DialogDescription>

                    <ul className="mt-5 w-full border-t border-[#cecece] pt-5 text-left text-[12px] leading-[19.5px] text-[#717171]">
                        <li className="flex gap-3">
                            <span className="mt-2 size-1 shrink-0 bg-[#cea25a]" aria-hidden />
                            Save lots to your gallery and follow upcoming sales.
                        </li>
                        <li className="mt-2 flex gap-3">
                            <span className="mt-2 size-1 shrink-0 bg-[#cea25a]" aria-hidden />
                            To bid, complete your KYC in My Profile and register for an auction — our team reviews it
                            before bidding opens to you.
                        </li>
                        <li className="mt-2 flex gap-3">
                            <span className="mt-2 size-1 shrink-0 bg-[#cea25a]" aria-hidden />
                            We&apos;ll send updates to <span className="break-all text-[#0d0d0d]">{email}</span>.
                        </li>
                    </ul>

                    <button type="button" onClick={close} className={cn(BUTTON, BUTTON_SOLID, "mt-7")}>
                        {signedIn ? "Continue" : "Continue to log in"}
                    </button>

                    {/* read out once, not every second */}
                    <p className={cn(EYEBROW, "mt-3")} aria-hidden>
                        Closing in {secondsLeft}s
                    </p>
                </div>

                {/* countdown bar: full on open, then one linear run down to empty */}
                <div className="h-1 w-full bg-[#fdf1e3]" aria-hidden>
                    <div
                        className="h-full bg-[#cea25a]"
                        style={{
                            width: barRunning ? "0%" : "100%",
                            transition: `width ${AUTO_CLOSE_SECONDS}s linear`,
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
