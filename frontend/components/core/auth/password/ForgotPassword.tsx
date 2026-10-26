"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"

import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/apiError"
import { requestPasswordReset } from "@/services/operations/passwordReset.api"
import { BUTTON, BUTTON_OUTLINE } from "@/components/core/frontend/storefront"

import { AuthField, AuthSubmitButton } from "../registration/AuthField"
import { PASSWORD_LINK, PasswordPageShell } from "./PasswordPageShell"

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// "Send again" waits this long between emails
const RESEND_COOLDOWN_SECONDS = 30

/** Step 1 of resetting a password: ask for the email and send the link. */
export function ForgotPassword() {
    const searchParams = useSearchParams()

    // the login form passes along whatever email was typed there
    const [email, setEmail] = useState(() => searchParams.get("email") ?? "")
    const [error, setError] = useState<string>()
    const [sending, setSending] = useState(false)
    // set once a link has been requested: shows the "check your email" step
    const [sentTo, setSentTo] = useState<string | null>(null)
    const [cooldown, setCooldown] = useState(0)

    useEffect(() => {
        if (cooldown <= 0) return
        const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
        return () => window.clearTimeout(id)
    }, [cooldown])

    const send = async (address: string) => {
        setSending(true)
        try {
            await requestPasswordReset(address)
            setSentTo(address)
            setCooldown(RESEND_COOLDOWN_SECONDS)
            return true
        } catch (err) {
            toast.error(getErrorMessage(err))
            return false
        } finally {
            setSending(false)
        }
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const address = email.trim().toLowerCase()
        if (!address) return setError("Enter your email address")
        if (!emailRegex.test(address)) return setError("Enter a valid email address")
        await send(address)
    }

    const handleResend = async () => {
        if (!sentTo || cooldown > 0 || sending) return
        if (await send(sentTo)) toast.success(`We've sent another link to ${sentTo}`)
    }

    if (sentTo) {
        return (
            <PasswordPageShell
                crumb="Forgot password"
                title="Check your email"
                intro="Follow the link in the email to choose a new password."
            >
                <div className="flex flex-col gap-4" role="status">
                    <p className="text-[14px] leading-[22.75px] text-[#717171]">
                        If an account exists for <span className="break-all text-[#0d0d0d]">{sentTo}</span>, we&apos;ve sent it a link to
                        reset the password. The link expires in 30 minutes and can be used once.
                    </p>
                    <p className="text-[12px] leading-[19.5px] text-[#717171]">
                        Nothing arrived? Check your spam folder, or send the email again.
                    </p>

                    <div className="mt-2 flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={cooldown > 0 || sending}
                            className={cn(BUTTON, BUTTON_OUTLINE, "h-12 text-[14px]")}
                        >
                            {sending ? "Sending..." : cooldown > 0 ? `Send again in ${cooldown}s` : "Send the link again"}
                        </button>
                        <button type="button" onClick={() => setSentTo(null)} className={cn(PASSWORD_LINK, "cursor-pointer")}>
                            Use a different email
                        </button>
                        <Link href="/registration" className={PASSWORD_LINK}>
                            Back to log in
                        </Link>
                    </div>
                </div>
            </PasswordPageShell>
        )
    }

    return (
        <PasswordPageShell
            crumb="Forgot password"
            title="Forgot your password?"
            intro="Enter the email you use to log in and we'll send you a link to choose a new password."
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <AuthField
                    id="forgot-email"
                    name="email"
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    maxLength={254}
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value)
                        setError(undefined)
                    }}
                    error={error}
                />

                <div className="mt-2 flex flex-col gap-3">
                    <AuthSubmitButton loading={sending} loadingText="Sending link...">
                        Send reset link
                    </AuthSubmitButton>
                    <Link href="/registration" className={PASSWORD_LINK}>
                        Back to log in
                    </Link>
                </div>
            </form>
        </PasswordPageShell>
    )
}
