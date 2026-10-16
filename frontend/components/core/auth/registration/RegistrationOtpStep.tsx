"use client"

import { useEffect, useState } from "react"
import OtpInput from "react-otp-input"
import toast from "react-hot-toast"

import { useAppDispatch } from "@/hooks/redux"
import { sendSignupOtp, verifySignupOtp, verifySignupPhoneOtp } from "@/services/operations/auth.api"
import type { SignupPayload } from "@/lib/types/auth.types"
import { cn } from "@/lib/utils"
import { AuthFieldError, AuthSubmitButton, authInputErrorClass, authLabelClass } from "./AuthField"

const OTP_LENGTH = 6

// mirrors PENDING_TTL in the backend auth service — the pending signup (and its code) lives this long
const OTP_TTL_SECONDS = 10 * 60

const RESEND_COOLDOWN_SECONDS = 30

// backend messages that mean the current code can no longer be used, only replaced
const DEAD_CODE_PATTERN = /too many|expired|not found/i

export type OtpChannel = "email" | "phone"

function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

type RegistrationOtpStepProps = {
    channel: OtpChannel
    payload: SignupPayload
    sentAt: number
    onEditDetails: () => void
    onResent: (sentAt: number) => void
    onVerified: () => void
}

export function RegistrationOtpStep({
    channel,
    payload,
    sentAt,
    onEditDetails,
    onResent,
    onVerified,
}: RegistrationOtpStepProps) {
    const dispatch = useAppDispatch()

    const [otp, setOtp] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [codeIsDead, setCodeIsDead] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [resending, setResending] = useState(false)

    const [now, setNow] = useState(() => Date.now())

    // bumping this remounts the OTP boxes so focus jumps back to the first one
    const [inputKey, setInputKey] = useState(0)

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    const isPhone = channel === "phone"

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
            setError(`Enter the ${OTP_LENGTH}-digit code`)
            return
        }

        if (expired) {
            setError("This code has expired. Request a new one below.")
            return
        }

        setVerifying(true)
        setError(null)

        const verifyCode = isPhone ? verifySignupPhoneOtp : verifySignupOtp

        try {
            await dispatch(verifyCode({ email: payload.email, otp: code })).unwrap()
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

        // verifying stays true: the parent unmounts this step and moves on
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
            // the backend has no separate resend endpoint: registering again issues a fresh code,
            // which also clears the email verification, so the parent sends the user back to that step
            await dispatch(sendSignupOtp(payload)).unwrap()

            setCodeIsDead(false)
            setError(null)
            resetInput()
            toast.success(
                isPhone
                    ? `A new code has been sent to ${payload.email}. Verify your email again to continue.`
                    : `A new code has been sent to ${payload.email}`
            )
            onResent(Date.now())
        } catch (err) {
            setError(typeof err === "string" ? err : "Could not resend the code. Please try again.")
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <p className="text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">
                    Step {isPhone ? 2 : 1} of 2
                </p>
                <h2 className="mt-2 text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">
                    {isPhone ? "Verify your mobile number" : "Verify your email"}
                </h2>
                <p className="mt-2 text-[12px] leading-[19.5px] text-[#717171]">
                    {isPhone ? (
                        <>
                            Enter the {OTP_LENGTH}-digit code to verify{" "}
                            <span className="text-[#0d0d0d]">{payload.phone}</span>.{" "}
                            {/* temporary: no SMS provider yet, so the phone step reuses the emailed code */}
                            For now, use the same code we sent to{" "}
                            <span className="break-all text-[#0d0d0d]">{payload.email}</span>
                        </>
                    ) : (
                        <>
                            Enter the {OTP_LENGTH}-digit code we sent to{" "}
                            <span className="break-all text-[#0d0d0d]">{payload.email}</span>
                        </>
                    )}
                </p>
                <button
                    type="button"
                    onClick={onEditDetails}
                    disabled={verifying}
                    className="mt-3 cursor-pointer text-[11px] leading-[13.2px] tracking-[0.16em] text-[#0d0d0d] uppercase underline underline-offset-4 hover:text-[#717171] disabled:cursor-not-allowed disabled:opacity-60"
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
                                        "h-12 w-full min-w-0 flex-1 rounded-none border border-[#cecece] bg-white text-center text-[18px] text-[#0d0d0d] outline-none transition-colors focus:border-[#0d0d0d] disabled:bg-[#f7f7f7] disabled:opacity-60",
                                        error && authInputErrorClass
                                    )}
                                />
                            )}
                        />
                    </div>

                    <AuthFieldError id="otp-error" message={error ?? undefined} />

                    {!codeIsDead && (
                        <p className={cn("mt-2 text-[12px] leading-4.5", expired ? "text-[#cf4533]" : "text-[#717171]")}>
                            {expired
                                ? "This code has expired. Request a new one below."
                                : `Code expires in ${formatCountdown(secondsLeft)}`}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <AuthSubmitButton loading={verifying} loadingText="Verifying..." disabled={!canVerify}>
                        {isPhone ? <>Verify &amp; create account</> : "Verify email"}
                    </AuthSubmitButton>

                    <p className="text-center text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">
                        Didn&apos;t get the code?{" "}
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendIn > 0 || resending || verifying}
                            className="cursor-pointer text-[#0d0d0d] uppercase underline underline-offset-4 disabled:cursor-not-allowed disabled:text-[#717171]/70 disabled:no-underline"
                        >
                            {resending ? "Sending..." : resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                        </button>
                    </p>
                </div>
            </form>
        </div>
    )
}
