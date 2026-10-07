"use client"

import { useState } from "react"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { changeMyPassword } from "@/services/operations/profile.api"
import { AuthField } from "@/components/core/auth/registration/AuthField"
import { getErrorMessage, ProfileButton, ProfileSection } from "./ProfileUI"

const initialForm = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
}

type FormData = typeof initialForm
type FieldKey = keyof FormData
type FieldErrors = Partial<Record<FieldKey, string>>

const fieldId = (key: FieldKey) => `password-${key}`

const fieldOrder: FieldKey[] = ["currentPassword", "newPassword", "confirmPassword"]

// rules mirror changePasswordSchema on the backend
function validate(data: FormData): FieldErrors {
    const errors: FieldErrors = {}

    if (!data.currentPassword) errors.currentPassword = "Enter your current password"

    if (!data.newPassword) errors.newPassword = "Enter a new password"
    else if (data.newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters"
    else if (data.newPassword.length > 64) errors.newPassword = "Password must be 64 characters or fewer"
    else if (!/[0-9]/.test(data.newPassword)) errors.newPassword = "Password must contain at least one number"
    else if (!/[^A-Za-z0-9]/.test(data.newPassword)) errors.newPassword = "Password must contain at least one symbol"
    else if (data.newPassword === data.currentPassword)
        errors.newPassword = "New password must be different from your current password"

    if (!data.confirmPassword) errors.confirmPassword = "Re-enter your new password"
    else if (data.confirmPassword !== data.newPassword) errors.confirmPassword = "Passwords do not match"

    return errors
}

// map a backend message back onto the field it's about
function fieldForMessage(message: string): FieldKey | null {
    if (/current password/i.test(message)) return "currentPassword"
    if (/password/i.test(message)) return "newPassword"
    return null
}

export function ChangePasswordForm() {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [form, setForm] = useState(initialForm)
    const [errors, setErrors] = useState<FieldErrors>({})
    const [saving, setSaving] = useState(false)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const key = event.target.name as FieldKey
        const { value } = event.target

        setForm((prev) => ({ ...prev, [key]: value }))
        setErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    const focusField = (key: FieldKey) => document.getElementById(fieldId(key))?.focus()

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const validationErrors = validate(form)
        const firstInvalid = fieldOrder.find((key) => validationErrors[key])

        if (firstInvalid) {
            setErrors(validationErrors)
            focusField(firstInvalid)
            return
        }

        setSaving(true)

        try {
            await changeMyPassword(
                { currentPassword: form.currentPassword, newPassword: form.newPassword },
                token
            )
            setForm(initialForm)
            setErrors({})
            toast.success("Password updated. Other devices have been signed out.")
        } catch (error) {
            const message = getErrorMessage(error)
            const field = fieldForMessage(message)

            if (field) {
                setErrors({ [field]: message })
                focusField(field)
            } else {
                toast.error(message)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <ProfileSection title="Change password">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                <AuthField
                    id={fieldId("currentPassword")}
                    name="currentPassword"
                    label="Current password"
                    type="password"
                    placeholder="Current password"
                    autoComplete="current-password"
                    value={form.currentPassword}
                    onChange={handleChange}
                    error={errors.currentPassword}
                />

                <div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                        <AuthField
                            id={fieldId("newPassword")}
                            name="newPassword"
                            label="New password"
                            type="password"
                            placeholder="New password"
                            autoComplete="new-password"
                            maxLength={64}
                            value={form.newPassword}
                            onChange={handleChange}
                            error={errors.newPassword}
                        />
                        <AuthField
                            id={fieldId("confirmPassword")}
                            name="confirmPassword"
                            label="Confirm new password"
                            type="password"
                            placeholder="Confirm new password"
                            autoComplete="new-password"
                            maxLength={64}
                            value={form.confirmPassword}
                            onChange={handleChange}
                            error={errors.confirmPassword}
                        />
                    </div>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        Minimum 8 characters, with at least one number and one symbol.
                    </p>
                </div>

                <div>
                    <ProfileButton loading={saving} loadingText="Updating...">
                        Update password
                    </ProfileButton>
                </div>
            </form>
        </ProfileSection>
    )
}
