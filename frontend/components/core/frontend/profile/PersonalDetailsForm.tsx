"use client"

import { useState } from "react"
import toast from "react-hot-toast"

import { useAppDispatch, useAppSelector } from "@/hooks/redux"
import { setUser } from "@/redux/slices/authSlice"
import { updateMyProfile } from "@/services/operations/profile.api"
import type { MyAccount, UpdateProfilePayload } from "@/lib/types/profile.types"
import { COUNTRY_CODES, splitPhone } from "@/lib/constants/countryCodes"
import { cn } from "@/lib/utils"
import {
    AuthField,
    AuthFieldError,
    authInputClass,
    authInputErrorClass,
    authLabelClass,
} from "@/components/core/auth/registration/AuthField"
import { getErrorMessage, ProfileButton, ProfileSection } from "./ProfileUI"

// signup stores "First Last" as the username and leaves the profile names empty
const hasProfileName = (account: MyAccount) => !!(account.profile?.firstName || account.profile?.lastName)

const toForm = (account: MyAccount) => {
    const { countryCode, number } = splitPhone(account.phone)
    const [usernameFirst = "", ...usernameRest] = hasProfileName(account) ? [] : account.username.trim().split(/\s+/)

    return {
        firstName: account.profile?.firstName || usernameFirst,
        lastName: account.profile?.lastName || usernameRest.join(" "),
        countryCode,
        phone: number,
    }
}

type FormData = ReturnType<typeof toForm>
type FieldKey = keyof FormData
type FieldErrors = Partial<Record<FieldKey, string>>

// ids are prefixed because every tab stays mounted and the billing/password forms have inputs too
const fieldId = (key: FieldKey) => `profile-${key}`

const fieldOrder: FieldKey[] = ["firstName", "lastName", "phone"]

// limits mirror updateMyProfileSchema on the backend
function validate(data: FormData): FieldErrors {
    const errors: FieldErrors = {}

    if (!data.firstName.trim()) errors.firstName = "Enter your first name"
    if (!data.lastName.trim()) errors.lastName = "Enter your last name"

    if (!data.phone) errors.phone = "Enter your mobile number"
    else if (data.phone.length !== 10) errors.phone = "Enter a valid 10-digit mobile number"

    return errors
}

type PersonalDetailsFormProps = {
    account: MyAccount
    onSaved: (account: MyAccount) => void
}

export function PersonalDetailsForm({ account, onSaved }: PersonalDetailsFormProps) {
    const dispatch = useAppDispatch()
    const token = useAppSelector((state) => state.auth.accessToken)
    const authUser = useAppSelector((state) => state.auth.user)

    const [initialForm, setInitialForm] = useState(() => toForm(account))
    const [form, setForm] = useState(initialForm)
    const [errors, setErrors] = useState<FieldErrors>({})
    const [saving, setSaving] = useState(false)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const key = event.target.name as FieldKey
        const value = key === "phone" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value

        setForm((prev) => ({ ...prev, [key]: value }))
        setErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const validationErrors = validate(form)
        const firstInvalid = fieldOrder.find((key) => validationErrors[key])

        if (firstInvalid) {
            setErrors(validationErrors)
            document.getElementById(fieldId(firstInvalid))?.focus()
            return
        }

        // only send what changed, so an untouched phone in an unexpected format is never rewritten
        const payload: UpdateProfilePayload = {}
        const firstName = form.firstName.trim()
        const lastName = form.lastName.trim()
        const phone = `${form.countryCode}${form.phone}`

        if (firstName !== initialForm.firstName) payload.firstName = firstName
        if (lastName !== initialForm.lastName) payload.lastName = lastName
        if (form.countryCode !== initialForm.countryCode || form.phone !== initialForm.phone) payload.phone = phone

        if (Object.keys(payload).length === 0) {
            toast("No changes to save")
            return
        }

        // names prefilled from the username aren't stored yet — save them with the first change
        if (!hasProfileName(account)) {
            payload.firstName = firstName
            payload.lastName = lastName
        }

        setSaving(true)

        try {
            const profile = await updateMyProfile(payload, token)
            const nextAccount: MyAccount = {
                ...account,
                profile,
                ...(payload.phone !== undefined && { phone, phoneVerified: false }),
            }
            const values = toForm(nextAccount)

            setInitialForm(values)
            setForm(values)
            onSaved(nextAccount)

            // keep the name shown elsewhere (header menus) in sync
            if (authUser) {
                dispatch(
                    setUser({
                        ...authUser,
                        profile: {
                            firstName: profile.firstName,
                            lastName: profile.lastName,
                            displayName: profile.displayName,
                            avatarUrl: profile.avatarUrl,
                        },
                    })
                )
            }

            toast.success("Your details have been saved")
        } catch (error) {
            const message = getErrorMessage(error)

            if (/phone/i.test(message)) {
                setErrors({ phone: message })
                document.getElementById(fieldId("phone"))?.focus()
            } else {
                toast.error(message)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <ProfileSection title="Personal details">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                    <AuthField
                        id={fieldId("firstName")}
                        name="firstName"
                        label="First name"
                        placeholder="First name"
                        autoComplete="given-name"
                        maxLength={50}
                        value={form.firstName}
                        onChange={handleChange}
                        error={errors.firstName}
                    />
                    <AuthField
                        id={fieldId("lastName")}
                        name="lastName"
                        label="Last name"
                        placeholder="Last name"
                        autoComplete="family-name"
                        maxLength={50}
                        value={form.lastName}
                        onChange={handleChange}
                        error={errors.lastName}
                    />
                </div>

                <div>
                    <AuthField
                        id="profile-email"
                        label="Email"
                        type="email"
                        value={account.email}
                        disabled
                        readOnly
                        aria-describedby="profile-email-hint"
                    />
                    <p id="profile-email-hint" className="mt-1.5 text-xs text-neutral-400">
                        Your email is used to log in and can&apos;t be changed here.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                    <div>
                        <label htmlFor={fieldId("countryCode")} className={authLabelClass}>
                            Country code
                        </label>
                        <select
                            id={fieldId("countryCode")}
                            name="countryCode"
                            value={form.countryCode}
                            onChange={handleChange}
                            className={cn(authInputClass, "cursor-pointer")}
                        >
                            {COUNTRY_CODES.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label} ({item.value})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor={fieldId("phone")} className={authLabelClass}>
                            Phone number
                        </label>
                        <input
                            id={fieldId("phone")}
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            placeholder="Phone number"
                            value={form.phone}
                            onChange={handleChange}
                            aria-invalid={errors.phone ? true : undefined}
                            aria-describedby={errors.phone ? "profile-phone-error" : undefined}
                            className={cn(authInputClass, errors.phone && authInputErrorClass)}
                        />
                        <AuthFieldError id="profile-phone-error" message={errors.phone} />
                    </div>
                </div>

                <div>
                    <ProfileButton loading={saving} loadingText="Saving...">
                        Save changes
                    </ProfileButton>
                </div>
            </form>
        </ProfileSection>
    )
}
