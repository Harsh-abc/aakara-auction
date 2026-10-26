"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import OtpInput from "react-otp-input"
import toast from "react-hot-toast"
import { Check, Copy } from "lucide-react"

import { BODY, Breadcrumb, EYEBROW, PAGE_MAIN, PAGE_TITLE } from "@/components/core/frontend/storefront"
import { useAppDispatch, useAppSelector } from "@/hooks/redux"
import { hasDashboardMfa } from "@/lib/accessToken"
import { getErrorMessage } from "@/lib/apiError"
import { canAccessDashboard } from "@/lib/constants/roles"
import type { MfaSetup } from "@/lib/types/mfa.types"
import { cn } from "@/lib/utils"
import { logoutUser } from "@/services/operations/auth.api"
import { getMfaStatus, startMfaSetup, verifyMfaCode } from "@/services/operations/mfa.api"

import { AuthFieldError, AuthSubmitButton, authInputErrorClass, authLabelClass } from "../registration/AuthField"

const CODE_LENGTH = 6

const APP_LINKS = [
    { label: "Android", href: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" },
    { label: "iPhone", href: "https://apps.apple.com/app/google-authenticator/id388497605" },
]

// only dashboard pages, so ?redirect= can't send anyone off-site
const safeRedirect = (value: string | null) =>
    value && /^\/dashboard(\/|\?|$)/.test(value) ? value : "/dashboard"

// "ABCD EFGH …" is easier to type into the app
const groupKey = (key: string) => key.replace(/(.{4})/g, "$1 ").trim()

type Phase = { kind: "loading" } | { kind: "setup"; setup: MfaSetup } | { kind: "code"; account: string } | { kind: "error"; message: string }

/**
 * /authenticator — a dashboard role's login enters a Google Authenticator code before the
 * dashboard opens (the API refuses it until then). The first time, they scan a QR code.
 */
export function DashboardAuthenticator() {
    const router = useRouter()
    const dispatch = useAppDispatch()
    const searchParams = useSearchParams()
    const redirectTo = safeRedirect(searchParams.get("redirect"))
    // sent here because the last code's 6 hours ran out (DashboardGuard)
    const codeExpired = searchParams.get("expired") === "1"

    const token = useAppSelector((state) => state.auth.accessToken)
    const user = useAppSelector((state) => state.auth.user)
    const role = useAppSelector((state) => state.auth.role)
    const isDashboardRole = canAccessDashboard(role)
    const alreadyVerified = hasDashboardMfa(token)

    const [phase, setPhase] = useState<Phase>({ kind: "loading" })
    // how long a code keeps the dashboard open (from the API — 6 hours)
    const [validForSeconds, setValidForSeconds] = useState<number | null>(null)
    const [attempt, setAttempt] = useState(0)
    const [code, setCode] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [verifying, setVerifying] = useState(false)
    const [copied, setCopied] = useState(false)
    // bumping this remounts the code boxes so focus jumps back to the first one
    const [inputKey, setInputKey] = useState(0)

    // not signed in, not a dashboard role, or already through → somewhere else
    useEffect(() => {
        if (!user || !token) {
            router.replace(`/registration?redirect=${encodeURIComponent(`/authenticator?redirect=${redirectTo}`)}`)
        } else if (!isDashboardRole) {
            toast.error("You don't have access to the dashboard")
            router.replace("/")
        } else if (alreadyVerified) {
            router.replace(redirectTo)
        }
    }, [user, token, isDashboardRole, alreadyVerified, redirectTo, router])

    // set up already → ask for the code; first time → the QR code to scan
    useEffect(() => {
        if (!token || !isDashboardRole || alreadyVerified) return
        let cancelled = false
        getMfaStatus(token)
            .then(async (status) => {
                const next: Phase = status.enabled
                    ? { kind: "code", account: status.account }
                    : { kind: "setup", setup: await startMfaSetup(token) }
                if (cancelled) return
                setValidForSeconds(status.validForSeconds)
                setPhase(next)
            })
            .catch((err) => {
                if (!cancelled) setPhase({ kind: "error", message: getErrorMessage(err) })
            })
        return () => {
            cancelled = true
        }
        // the token changes once the code is accepted — that's the moment to leave, not to reload
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDashboardRole, attempt])

    const verify = async (value: string) => {
        if (verifying) return
        if (value.length !== CODE_LENGTH) {
            setError(`Enter the ${CODE_LENGTH}-digit code`)
            return
        }
        setVerifying(true)
        setError(null)
        try {
            const message = await verifyMfaCode(token, value)
            toast.success(message === "Authenticator set up" ? "Authenticator set up — welcome to the dashboard" : "Code accepted")
            // verifying stays true: the redirect effect takes over now the token carries the code
        } catch (err) {
            setError(getErrorMessage(err, "Could not check the code. Please try again."))
            setCode("")
            setInputKey((key) => key + 1)
            setVerifying(false)
        }
    }

    const handleCodeChange = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH)
        setCode(digits)
        if (error) setError(null)
        if (digits.length === CODE_LENGTH) void verify(digits)
    }

    const copyKey = async (key: string) => {
        try {
            await navigator.clipboard.writeText(key)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error("Couldn't copy — select the key and copy it instead")
        }
    }

    const signOut = async () => {
        await dispatch(logoutUser())
        router.replace("/registration")
    }

    const isSetup = phase.kind === "setup"
    const validFor = validForSeconds
        ? validForSeconds % 3600 === 0
            ? `${validForSeconds / 3600} hour${validForSeconds === 3600 ? "" : "s"}`
            : `${Math.round(validForSeconds / 60)} minutes`
        : null
    const account = phase.kind === "setup" ? phase.setup.account : phase.kind === "code" ? phase.account : user?.email

    const codeForm = (
        <form
            onSubmit={(event) => {
                event.preventDefault()
                void verify(code)
            }}
            className="flex flex-col gap-6"
            noValidate
        >
            <div>
                <span id="mfa-code-label" className={authLabelClass}>
                    {isSetup ? "3. Enter the 6-digit code it shows" : "Authenticator code"}
                </span>
                <div role="group" aria-labelledby="mfa-code-label" aria-describedby={error ? "mfa-code-error" : undefined}>
                    <OtpInput
                        key={inputKey}
                        value={code}
                        onChange={handleCodeChange}
                        numInputs={CODE_LENGTH}
                        inputType="tel"
                        shouldAutoFocus
                        skipDefaultStyles
                        containerStyle="flex gap-2"
                        renderInput={(inputProps) => (
                            <input
                                {...inputProps}
                                disabled={verifying}
                                autoComplete="one-time-code"
                                className={cn(
                                    "h-12 w-full min-w-0 flex-1 rounded-none border border-[#cecece] bg-white text-center text-[18px] text-[#0d0d0d] outline-none transition-colors focus:border-[#0d0d0d] disabled:bg-[#f7f7f7] disabled:opacity-60",
                                    error && authInputErrorClass
                                )}
                            />
                        )}
                    />
                </div>
                <AuthFieldError id="mfa-code-error" message={error ?? undefined} />
                <p className="mt-2 text-[12px] leading-4.5 text-[#717171]">The code changes every 30 seconds.</p>
            </div>

            <AuthSubmitButton loading={verifying} loadingText="Checking..." disabled={code.length !== CODE_LENGTH}>
                {isSetup ? "Confirm & open the dashboard" : "Open the dashboard"}
            </AuthSubmitButton>
        </form>
    )

    // on the way somewhere else — don't flash the form
    if (!user || !token || !isDashboardRole || alreadyVerified) return <main className={PAGE_MAIN} aria-busy="true" />

    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb auctions={false} crumbs={[{ label: "Dashboard sign-in" }]} />
                    <h1 className={cn(PAGE_TITLE, "mt-6")}>{isSetup ? "Set up Google Authenticator" : "Enter your code"}</h1>
                    <p className={cn(BODY, "mt-3 max-w-2xl")}>
                        {isSetup
                            ? "The dashboard is protected by a second step. Link Google Authenticator to your account once — after that, every time you log in you'll enter the code it shows."
                            : codeExpired
                              ? `Your last code was entered ${validFor ?? "a while"} ago. For security, enter a new one from Google Authenticator to keep using the dashboard.`
                              : "Open Google Authenticator on your phone and enter the code shown for your Aakara account."}
                        {validFor && !codeExpired && ` A code keeps the dashboard open for ${validFor}.`}
                    </p>
                </div>
            </section>

            <section>
                <div className="page-container">
                    <div className="mx-auto w-full max-w-[460px] border border-[#333] bg-white p-5 sm:p-6.5">
                        {account && (
                            <p className="mb-6 text-[12px] leading-[19.5px] text-[#717171]">
                                Signed in as <span className="break-all text-[#0d0d0d]">{account}</span> ·{" "}
                                <button
                                    type="button"
                                    onClick={signOut}
                                    className="cursor-pointer text-[#0d0d0d] underline underline-offset-4 hover:text-[#717171]"
                                >
                                    Not you? Log out
                                </button>
                            </p>
                        )}

                        {phase.kind === "loading" && <p className={BODY}>Loading…</p>}

                        {phase.kind === "error" && (
                            <div className="flex flex-col gap-4">
                                <AuthFieldError id="mfa-load-error" message={phase.message} />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPhase({ kind: "loading" })
                                        setAttempt((n) => n + 1)
                                    }}
                                    className="cursor-pointer self-start text-[11px] tracking-[0.16em] text-[#0d0d0d] uppercase underline underline-offset-4"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {phase.kind === "setup" && (
                            <div className="flex flex-col gap-6">
                                <div>
                                    <p className={authLabelClass}>1. Install Google Authenticator</p>
                                    <p className="text-[12px] leading-[19.5px] text-[#717171]">
                                        Free on{" "}
                                        {APP_LINKS.map((link, i) => (
                                            <span key={link.label}>
                                                {i > 0 && " and "}
                                                <a
                                                    href={link.href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[#0d0d0d] underline underline-offset-4"
                                                >
                                                    {link.label}
                                                </a>
                                            </span>
                                        ))}
                                        . Any authenticator app works.
                                    </p>
                                </div>

                                <div>
                                    <p className={authLabelClass}>2. Scan this QR code in the app</p>
                                    <div className="flex flex-col items-center gap-4 border border-[#cecece] bg-[#faf9f7] p-4">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={phase.setup.qrCode}
                                            alt="QR code to add your Aakara account to Google Authenticator"
                                            width={200}
                                            height={200}
                                            className="size-50 bg-white"
                                        />
                                        <div className="w-full">
                                            <p className={cn(EYEBROW, "mb-2")}>Can&apos;t scan? Enter this key</p>
                                            <div className="flex items-center gap-2">
                                                <code className="min-w-0 flex-1 break-all border border-[#cecece] bg-white px-3 py-2 font-mono text-[13px] tracking-wider text-[#0d0d0d]">
                                                    {groupKey(phase.setup.secret)}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => copyKey(phase.setup.secret)}
                                                    className="flex size-10 shrink-0 cursor-pointer items-center justify-center border border-[#cecece] bg-white text-[#0d0d0d] hover:border-[#0d0d0d]"
                                                    aria-label="Copy the key"
                                                >
                                                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                                                </button>
                                            </div>
                                            <p className="mt-2 text-[11px] leading-4.5 text-[#717171]">
                                                Account: {phase.setup.account} · Time-based
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {codeForm}
                            </div>
                        )}

                        {phase.kind === "code" && codeForm}

                        <p className="mt-6 border-t border-[#ececec] pt-4 text-[12px] leading-[19.5px] text-[#717171]">
                            Lost or changed your phone? Ask a super admin to reset your authenticator — you&apos;ll scan a new QR code next time.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    )
}
