"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import OtpInput from "react-otp-input"
import toast from "react-hot-toast"

import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/apiError"
import { requestPasswordReset, verifyResetOtp } from "@/services/operations/passwordReset.api"

import { AuthField, AuthFieldError, AuthSubmitButton, authInputErrorClass, authLabelClass } from "../registration/AuthField"
import { PASSWORD_LINK, PasswordPageShell } from "./PasswordPageShell"
import { ResetPassword } from "./ResetPassword"

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const OTP_LENGTH = 6

// mirrors OTP_TTL_MINUTES in the backend passwordReset service
const OTP_TTL_SECONDS = 10 * 60

// "Send a new code" waits this long between emails
const RESEND_COOLDOWN_SECONDS = 30

// backend answers meaning the code can't be used any more, only replaced
const DEAD_CODE = /expired|too many|request a new/i

function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

/**
 * Resetting a password, all on one page: email → 6-digit code from the email → new password.
 * A code rather than a link, so it works even when the email is read on another device (usually the phone).
 */
export function ForgotPassword() {
    const searchParams = useSearchParams()

    // the login form passes along whatever email was typed there
    const [email, setEmail] = useState(() => searchParams.get("email") ?? "")
    const [emailError, setEmailError] = useState<string>()
    const [sending, setSending] = useState(false)

    // set once a code has been requested: shows the "enter the code" step
    const [sentTo, setSentTo] = useState<string | null>(null)
    const [sentAt, setSentAt] = useState(0)

    const [otp, setOtp] = useState("")
    const [otpError, setOtpError] = useState<string | null>(null)
    const [codeIsDead, setCodeIsDead] = useState(false)
    const [verifying, setVerifying] = useState(false)
    // bumping this remounts the code boxes so focus jumps back to the first one
    const [inputKey, setInputKey] = useState(0)

    // set once the code checks out: shows the "choose a new password" step
    const [resetToken, setResetToken] = useState<string | null>(null)

    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (!sentTo) return
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [sentTo])

    const secondsLeft = Math.max(0, Math.ceil((sentAt + OTP_TTL_SECONDS * 1000 - now) / 1000))
    const resendIn = Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000))
    const expired = secondsLeft === 0
    const canVerify = otp.length === OTP_LENGTH && !expired && !codeIsDead

    const clearCode = () => {
        setOtp("")
        setInputKey((key) => key + 1)
    }

    const send = async (address: string) => {
        setSending(true)
        try {
            await requestPasswordReset(address)
            const sentNow = Date.now()
            setSentTo(address)
            setSentAt(sentNow)
            setNow(sentNow)
            setCodeIsDead(false)
            setOtpError(null)
            clearCode()
            return true
        } catch (err) {
            toast.error(getErrorMessage(err))
            return false
        } finally {
            setSending(false)
        }
    }

    const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const address = email.trim().toLowerCase()
        if (!address) return setEmailError("Enter your email address")
        if (!emailRegex.test(address)) return setEmailError("Enter a valid email address")
        await send(address)
    }

    const handleResend = async () => {
        if (!sentTo || resendIn > 0 || sending || verifying) return
        if (await send(sentTo)) toast.success(`We've sent a new code to ${sentTo}`)
    }

    const verify = async (code: string) => {
        if (!sentTo || verifying) return
        if (code.length !== OTP_LENGTH) return setOtpError(`Enter the ${OTP_LENGTH}-digit code`)
        if (expired) return setOtpError("This code has expired. Get a new one below.")

        setVerifying(true)
        setOtpError(null)
        try {
            setResetToken(await verifyResetOtp(sentTo, code))
        } catch (err) {
            const message = getErrorMessage(err)
            if (DEAD_CODE.test(message)) setCodeIsDead(true)
            setOtpError(message)
            clearCode()
        } finally {
            setVerifying(false)
        }
    }

    const handleOtpChange = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH)
        setOtp(digits)
        if (otpError && !codeIsDead) setOtpError(null)
        // the last digit sends it — nothing else to press
        if (digits.length === OTP_LENGTH && !expired && !codeIsDead) void verify(digits)
    }

    const startOver = () => {
        setResetToken(null)
        setSentTo(null)
        clearCode()
    }

    if (resetToken) return <ResetPassword token={resetToken} onRestart={startOver} />

    if (sentTo) {
        return (
            <PasswordPageShell
                crumb="Forgot password"
                title="Enter the code"
                intro="Check your email for a 6-digit code and type it in below."
            >
                <form
                    onSubmit={(event) => {
                        event.preventDefault()
                        void verify(otp)
                    }}
                    className="flex flex-col gap-4"
                    noValidate
                >
                    <p className="text-[14px] leading-[22.75px] text-[#717171]">
                        If an account exists for <span className="break-all text-[#0d0d0d]">{sentTo}</span>, we&apos;ve sent it a{" "}
                        {OTP_LENGTH}-digit code.
                    </p>

                    <div>
                        <span id="reset-otp-label" className={authLabelClass}>
                            Reset code
                        </span>
                        <div role="group" aria-labelledby="reset-otp-label" aria-describedby={otpError ? "reset-otp-error" : undefined}>
                            <OtpInput
                                key={inputKey}
                                value={otp}
                                onChange={handleOtpChange}
                                numInputs={OTP_LENGTH}
                                inputType="tel"
                                shouldAutoFocus
                                skipDefaultStyles
                                containerStyle="flex gap-2"
                                renderInput={(inputProps) => (
                                    <input
                                        {...inputProps}
                                        disabled={verifying || codeIsDead}
                                        autoComplete="one-time-code"
                                        className={cn(
                                            "h-12 w-full min-w-0 flex-1 rounded-none border border-[#cecece] bg-white text-center text-[18px] text-[#0d0d0d] outline-none transition-colors focus:border-[#0d0d0d] disabled:bg-[#f7f7f7] disabled:opacity-60",
                                            otpError && authInputErrorClass
                                        )}
                                    />
                                )}
                            />
                        </div>
                        <AuthFieldError id="reset-otp-error" message={otpError ?? undefined} />
                        {!codeIsDead && (
                            <p className={cn("mt-2 text-[12px] leading-4.5", expired ? "text-[#cf4533]" : "text-[#717171]")}>
                                {expired ? "This code has expired. Get a new one below." : `Code expires in ${formatCountdown(secondsLeft)}`}
                            </p>
                        )}
                    </div>

                    <p className="text-[12px] leading-[19.5px] text-[#717171]">Nothing arrived? Check your spam folder, or get a new code.</p>

                    <div className="mt-2 flex flex-col gap-3">
                        <AuthSubmitButton loading={verifying} loadingText="Checking..." disabled={!canVerify}>
                            Continue
                        </AuthSubmitButton>
                        <p className="text-center text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">
                            Didn&apos;t get the code?{" "}
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendIn > 0 || sending || verifying}
                                className="cursor-pointer text-[#0d0d0d] uppercase underline underline-offset-4 disabled:cursor-not-allowed disabled:text-[#717171]/70 disabled:no-underline"
                            >
                                {sending ? "Sending..." : resendIn > 0 ? `Resend in ${resendIn}s` : "Send a new code"}
                            </button>
                        </p>
                        <button type="button" onClick={startOver} disabled={verifying} className={cn(PASSWORD_LINK, "cursor-pointer")}>
                            Use a different email
                        </button>
                        <Link href="/registration" className={PASSWORD_LINK}>
                            Back to log in
                        </Link>
                    </div>
                </form>
            </PasswordPageShell>
        )
    }

    return (
        <PasswordPageShell
            crumb="Forgot password"
            title="Forgot your password?"
            intro="Enter the email you use to log in and we'll send you a 6-digit code to reset your password."
        >
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4" noValidate>
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
                        setEmailError(undefined)
                    }}
                    error={emailError}
                />

                <div className="mt-2 flex flex-col gap-3">
                    <AuthSubmitButton loading={sending} loadingText="Sending code...">
                        Send code
                    </AuthSubmitButton>
                    <Link href="/registration" className={PASSWORD_LINK}>
                        Back to log in
                    </Link>
                </div>
            </form>
        </PasswordPageShell>
    )
}
