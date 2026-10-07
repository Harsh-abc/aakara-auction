"use client"

import { useEffect, useState } from "react"
import OtpInput from "react-otp-input"
import toast from "react-hot-toast"

import { useAppDispatch } from "@/hooks/redux"
import { sendSignupOtp, verifySignupOtp } from "@/services/operations/auth.api"
import type { SignupPayload } from "@/lib/types/auth.types"
import { cn } from "@/lib/utils"
import { AuthFieldError, AuthSubmitButton, authInputErrorClass, authLabelClass } from "./AuthField"

const OTP_LENGTH = 6

// mirrors PENDING_TTL in the backend auth service — the pending signup (and its code) lives this long
const OTP_TTL_SECONDS = 10 * 60

const RESEND_COOLDOWN_SECONDS = 30

// backend messages that mean the current code can no longer be used, only replaced
const DEAD_CODE_PATTERN = /too many|expired|not found/i

function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

type RegistrationOtpStepProps = {
    payload: SignupPayload
    sentAt: number
    onEditDetails: () => void
    onVerified: () => void
}

export function RegistrationOtpStep({ payload, sentAt: initialSentAt, onEditDetails, onVerified }: RegistrationOtpStepProps) {
    const dispatch = useAppDispatch()

    const [otp, setOtp] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [codeIsDead, setCodeIsDead] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [resending, setResending] = useState(false)

    const [sentAt, setSentAt] = useState(initialSentAt)
    const [now, setNow] = useState(initialSentAt)

    // bumping this remounts the OTP boxes so focus jumps back to the first one
    const [inputKey, setInputKey] = useState(0)

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    const secondsLeft = Math.max(0, Math.ceil((sentAt + OTP_TTL_SECONDS * 1000 - now) / 1000))
    const resendIn = Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000))
    const expired = secondsLeft === 0
    const canVerify = otp.length === OTP_LENGTH && !expired && !codeIsDead

    const resetInput = () => {
        setOtp("")
        setInputKey((key) => key + 1)
    }

    const verify = async (code: string) => {
        if (verifying) return

        if (code.length !== OTP_LENGTH) {
            setError(`Enter the ${OTP_LENGTH}-digit code from your email`)
            return
        }

        if (expired) {
            setError("This code has expired. Request a new one below.")
            return
        }

        setVerifying(true)
        setError(null)

        try {
            await dispatch(verifySignupOtp({ email: payload.email, otp: code })).unwrap()
        } catch (err) {
            const message = typeof err === "string" ? err : "Verification failed. Please try again."

            if (DEAD_CODE_PATTERN.test(message)) {
                setCodeIsDead(true)
                setError(`${message.replace(/please register again\.?/i, "").trim()} Request a new code below.`)
            } else {
                setError(message)
            }

            resetInput()
            setVerifying(false)
            return
        }

        // verifying stays true: the parent unmounts this step and switches to the login tab
        onVerified()
    }

    const handleOtpChange = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH)
        setOtp(digits)
        if (error && !codeIsDead) setError(null)

        if (digits.length === OTP_LENGTH && !expired && !codeIsDead) {
            void verify(digits)
        }
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        void verify(otp)
    }

    const handleResend = async () => {
        if (resendIn > 0 || resending || verifying) return

        setResending(true)

        try {
            // the backend has no separate resend endpoint: registering again issues a fresh code
            await dispatch(sendSignupOtp(payload)).unwrap()

            const sentNow = Date.now()
            setSentAt(sentNow)
            setNow(sentNow)
            setCodeIsDead(false)
            setError(null)
            resetInput()
            toast.success(`A new code has been sent to ${payload.email}`)
        } catch (err) {
            setError(typeof err === "string" ? err : "Could not resend the code. Please try again.")
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-lg text-neutral-900">Verify your email</h2>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                    Enter the {OTP_LENGTH}-digit code we sent to{" "}
                    <span className="break-all text-neutral-900">{payload.email}</span>
                </p>
                <button
                    type="button"
                    onClick={onEditDetails}
                    disabled={verifying}
                    className="mt-3 cursor-pointer text-[11px] uppercase tracking-[0.18em] text-neutral-900 underline underline-offset-4 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Edit details
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                <div>
                    <span id="otp-label" className={authLabelClass}>
                        Verification code
                    </span>

                    <div role="group" aria-labelledby="otp-label" aria-describedby={error ? "otp-error" : undefined}>
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
                                        "h-12 w-full min-w-0 flex-1 rounded-none border border-neutral-300 bg-white text-center text-lg text-neutral-900 outline-none transition-colors focus:border-neutral-900 disabled:bg-neutral-50 disabled:opacity-60",
                                        error && authInputErrorClass
                                    )}
                                />
                            )}
                        />
                    </div>

                    <AuthFieldError id="otp-error" message={error ?? undefined} />

                    {!codeIsDead && (
                        <p className={cn("mt-2 text-xs", expired ? "text-red-600" : "text-neutral-500")}>
                            {expired
                                ? "This code has expired. Request a new one below."
                                : `Code expires in ${formatCountdown(secondsLeft)}`}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <AuthSubmitButton loading={verifying} loadingText="Verifying..." disabled={!canVerify}>
                        Verify &amp; create account
                    </AuthSubmitButton>

                    <p className="text-center text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        Didn&apos;t get the code?{" "}
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendIn > 0 || resending || verifying}
                            className="cursor-pointer uppercase text-neutral-900 underline underline-offset-4 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
                        >
                            {resending ? "Sending..." : resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                        </button>
                    </p>
                </div>
            </form>
        </div>
    )
}
