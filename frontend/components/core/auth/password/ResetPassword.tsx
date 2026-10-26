"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"

import { useAppDispatch } from "@/hooks/redux"
import { logout } from "@/redux/slices/authSlice"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/apiError"
import { resetPassword } from "@/services/operations/passwordReset.api"
import { BUTTON, BUTTON_SOLID, EYEBROW } from "@/components/core/frontend/storefront"

import { AuthField, AuthSubmitButton } from "../registration/AuthField"
import { PASSWORD_LINK, PasswordPageShell } from "./PasswordPageShell"

type FieldErrors = Partial<Record<"password" | "confirmPassword", string>>

// the same rules the backend applies (and "change password" in My profile)
function validate(password: string, confirmPassword: string): FieldErrors {
    const errors: FieldErrors = {}
    if (!password) errors.password = "Enter a new password"
    else if (password.length < 8) errors.password = "Password must be at least 8 characters"
    else if (password.length > 64) errors.password = "Password must be 64 characters or fewer"
    else if (!/[0-9]/.test(password)) errors.password = "Password must contain at least one number"
    else if (!/[^A-Za-z0-9]/.test(password)) errors.password = "Password must contain at least one symbol"

    if (!confirmPassword) errors.confirmPassword = "Re-enter your new password"
    else if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match"
    return errors
}

// the backend's answers for a link that can't be used (expired, used, or cut short)
const DEAD_LINK = /expired|already been used|incomplete/i

/** Step 2 of resetting a password: the page the emailed button opens (?token=…). */
export function ResetPassword() {
    const router = useRouter()
    const dispatch = useAppDispatch()
    const token = useSearchParams().get("token") ?? ""

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [errors, setErrors] = useState<FieldErrors>({})
    const [saving, setSaving] = useState(false)
    // the link can't be used: say why, and offer a fresh one
    const [deadLink, setDeadLink] = useState<string | null>(token ? null : "This reset link is incomplete. Request a new one.")

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const validationErrors = validate(password, confirmPassword)
        const firstInvalid = (["password", "confirmPassword"] as const).find((key) => validationErrors[key])
        if (firstInvalid) {
            setErrors(validationErrors)
            document.getElementById(`reset-${firstInvalid}`)?.focus()
            return
        }

        setSaving(true)
        try {
            const { message } = await resetPassword(token, password)
            // the reset signed the account out everywhere — this browser included
            dispatch(logout())
            toast.success(message || "Your password has been reset. Log in with your new password.")
            router.replace("/registration")
        } catch (err) {
            const message = getErrorMessage(err)
            if (DEAD_LINK.test(message)) setDeadLink(message)
            else if (/password/i.test(message)) setErrors({ password: message })
            else toast.error(message)
            setSaving(false)
        }
    }

    if (deadLink) {
        return (
            <PasswordPageShell crumb="Reset password" title="Link expired" intro="Reset links last 30 minutes and work once.">
                <div className="flex flex-col gap-4" role="alert">
                    <p className="text-[14px] leading-[22.75px] text-[#717171]">{deadLink}</p>
                    <div className="mt-2 flex flex-col gap-3">
                        <Link href="/forgot-password" className={cn(BUTTON, BUTTON_SOLID, "h-12 text-[14px]")}>
                            Request a new link
                        </Link>
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
            crumb="Reset password"
            title="Choose a new password"
            intro="Once it's saved you'll be signed out everywhere, and can log in with the new password."
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <AuthField
                    id="reset-password"
                    name="password"
                    label="New password *"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    maxLength={64}
                    value={password}
                    onChange={(event) => {
                        setPassword(event.target.value)
                        setErrors((prev) => ({ ...prev, password: undefined }))
                    }}
                    error={errors.password}
                />
                <AuthField
                    id="reset-confirmPassword"
                    name="confirmPassword"
                    label="Confirm new password *"
                    type="password"
                    autoComplete="new-password"
                    maxLength={64}
                    value={confirmPassword}
                    onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                    }}
                    error={errors.confirmPassword}
                />
                <p className={EYEBROW}>Minimum 8 characters, with at least one number and one symbol.</p>

                <div className="mt-2 flex flex-col gap-3">
                    <AuthSubmitButton loading={saving} loadingText="Saving...">
                        Reset password
                    </AuthSubmitButton>
                    <Link href="/registration" className={PASSWORD_LINK}>
                        Back to log in
                    </Link>
                </div>
            </form>
        </PasswordPageShell>
    )
}
