"use client"

import { useState } from "react"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { updateMyProfile } from "@/services/operations/profile.api"
import type { MyAccount, UpdateProfilePayload } from "@/lib/types/profile.types"
import { AuthField } from "@/components/core/auth/registration/AuthField"
import { getErrorMessage, ProfileButton, ProfileSection } from "./ProfileUI"

const toForm = (account: MyAccount) => ({
    address: account.profile?.address ?? "",
    city: account.profile?.city ?? "",
    state: account.profile?.state ?? "",
    country: account.profile?.country ?? "",
    pincode: account.profile?.pincode ?? "",
})

type FormData = ReturnType<typeof toForm>
type FieldKey = keyof FormData
type FieldErrors = Partial<Record<FieldKey, string>>

const fieldId = (key: FieldKey) => `billing-${key}`

const fieldOrder: FieldKey[] = ["address", "city", "state", "country", "pincode"]

// limits mirror updateMyProfileSchema on the backend
function validate(data: FormData): FieldErrors {
    const errors: FieldErrors = {}

    if (!data.address.trim()) errors.address = "Enter your street address"
    if (!data.city.trim()) errors.city = "Enter your city"
    if (!data.state.trim()) errors.state = "Enter your state"
    if (!data.country.trim()) errors.country = "Enter your country"

    if (!data.pincode) errors.pincode = "Enter your pincode"
    else if (data.pincode.length !== 6) errors.pincode = "Pincode must be 6 digits"

    return errors
}

type BillingShippingFormProps = {
    account: MyAccount
    onSaved: (account: MyAccount) => void
}

export function BillingShippingForm({ account, onSaved }: BillingShippingFormProps) {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [initialForm, setInitialForm] = useState(() => toForm(account))
    const [form, setForm] = useState(initialForm)
    const [errors, setErrors] = useState<FieldErrors>({})
    const [saving, setSaving] = useState(false)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const key = event.target.name as FieldKey
        const value = key === "pincode" ? event.target.value.replace(/\D/g, "").slice(0, 6) : event.target.value

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

        const payload: UpdateProfilePayload = {}
        fieldOrder.forEach((key) => {
            const value = form[key].trim()
            if (value !== initialForm[key]) payload[key] = value
        })

        if (Object.keys(payload).length === 0) {
            toast("No changes to save")
            return
        }

        setSaving(true)

        try {
            const profile = await updateMyProfile(payload, token)
            const nextAccount: MyAccount = { ...account, profile }
            const values = toForm(nextAccount)

            setInitialForm(values)
            setForm(values)
            onSaved(nextAccount)

            toast.success("Your address has been saved")
        } catch (error) {
            const message = getErrorMessage(error)

            if (/pincode/i.test(message)) {
                setErrors({ pincode: message })
                document.getElementById(fieldId("pincode"))?.focus()
            } else {
                toast.error(message)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <ProfileSection
            title="Billing & shipping address"
            description="Used on your invoices and to deliver the lots you win."
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                <AuthField
                    id={fieldId("address")}
                    name="address"
                    label="Street address"
                    placeholder="House / flat, street, area"
                    autoComplete="street-address"
                    maxLength={255}
                    value={form.address}
                    onChange={handleChange}
                    error={errors.address}
                />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                    <AuthField
                        id={fieldId("city")}
                        name="city"
                        label="City"
                        placeholder="City"
                        autoComplete="address-level2"
                        maxLength={100}
                        value={form.city}
                        onChange={handleChange}
                        error={errors.city}
                    />
                    <AuthField
                        id={fieldId("state")}
                        name="state"
                        label="State"
                        placeholder="State"
                        autoComplete="address-level1"
                        maxLength={100}
                        value={form.state}
                        onChange={handleChange}
                        error={errors.state}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                    <AuthField
                        id={fieldId("country")}
                        name="country"
                        label="Country"
                        placeholder="Country"
                        autoComplete="country-name"
                        maxLength={100}
                        value={form.country}
                        onChange={handleChange}
                        error={errors.country}
                    />
                    <AuthField
                        id={fieldId("pincode")}
                        name="pincode"
                        label="Pincode"
                        placeholder="6 digits"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        value={form.pincode}
                        onChange={handleChange}
                        error={errors.pincode}
                    />
                </div>

                <div>
                    <ProfileButton loading={saving} loadingText="Saving...">
                        Save address
                    </ProfileButton>
                </div>
            </form>
        </ProfileSection>
    )
}
