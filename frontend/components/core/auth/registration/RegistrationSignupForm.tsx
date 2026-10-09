"use client"

import { useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"

import { useAppDispatch, useAppSelector } from "@/hooks/redux"
import { sendSignupOtp } from "@/services/operations/auth.api"
import type { SignupPayload } from "@/lib/types/auth.types"
import { cn } from "@/lib/utils"
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from "@/lib/constants/countryCodes"
import {
    AuthField,
    AuthFieldError,
    AuthSubmitButton,
    authInputClass,
    authInputErrorClass,
    authLabelClass,
} from "./AuthField"
import { RegistrationOtpStep, type OtpChannel } from "./RegistrationOtpStep"

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// mirrors the backend registerSchema username rule
const nameRegex = /^[a-zA-Z0-9_ ]+$/

const initialFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    password: "",
    confirmPassword: "",
    terms: false,
}

type FormData = typeof initialFormData
type FieldKey = keyof FormData
type FieldErrors = Partial<Record<FieldKey, string>>

// visual order of the fields, so focus lands on the first invalid one the user sees
const fieldOrder: FieldKey[] = [
    "email",
    "password",
    "confirmPassword",
    "firstName",
    "lastName",
    "phone",
    "city",
    "country",
    "terms",
]

// limits mirror the backend registerSchema
function validate(data: FormData): FieldErrors {
    const errors: FieldErrors = {}

    const email = data.email.trim()
    const firstName = data.firstName.trim()
    const lastName = data.lastName.trim()

    if (!email) errors.email = "Enter your email address"
    else if (!emailRegex.test(email)) errors.email = "Enter a valid email address"

    if (!data.password) errors.password = "Enter a password"
    else if (data.password.length < 8) errors.password = "Password must be at least 8 characters"
    else if (data.password.length > 64) errors.password = "Password must be 64 characters or fewer"

    if (!data.confirmPassword) errors.confirmPassword = "Re-enter your password"
    else if (data.confirmPassword !== data.password) errors.confirmPassword = "Passwords do not match"

    if (!firstName) errors.firstName = "Enter your first name"
    else if (!nameRegex.test(firstName)) errors.firstName = "Use letters, numbers, spaces or underscores only"

    if (!lastName) errors.lastName = "Enter your last name"
    else if (!nameRegex.test(lastName)) errors.lastName = "Use letters, numbers, spaces or underscores only"

    if (!errors.firstName && !errors.lastName && `${firstName} ${lastName}`.length > 50) {
        errors.lastName = "First and last name together must be 50 characters or fewer"
    }

    if (!data.phone) errors.phone = "Enter your mobile number"
    else if (data.phone.length !== 10) errors.phone = "Enter a valid 10-digit mobile number"

    if (!data.city.trim()) errors.city = "Enter your city"

    if (!data.country.trim()) errors.country = "Enter your country"

    if (!data.terms) errors.terms = "Please accept the Terms of Service to continue"

    return errors
}

// the backend answers a taken email/phone/username with "This <field> is already registered"
function fieldForConflict(message: string): FieldKey | null {
    if (!/already registered/i.test(message)) return null
    if (/email/i.test(message)) return "email"
    if (/phone/i.test(message)) return "phone"
    if (/username/i.test(message)) return "firstName"
    return null
}

type RegistrationSignupFormProps = {
    onAccountCreated: (email: string) => void
}

export function RegistrationSignupForm({ onAccountCreated }: RegistrationSignupFormProps) {
    const dispatch = useAppDispatch()
    const { loading } = useAppSelector((state) => state.auth)

    const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE)
    const [formData, setFormData] = useState(initialFormData)
    const [errors, setErrors] = useState<FieldErrors>({})

    // set once the OTP has been sent; its presence moves the tab to the verify steps (email, then phone)
    const [pendingSignup, setPendingSignup] = useState<{
        payload: SignupPayload
        sentAt: number
        step: OtpChannel
    } | null>(null)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const id = event.target.id as FieldKey
        const value = id === "phone" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value

        setFormData((prev) => ({ ...prev, [id]: value }))
        setErrors((prev) => ({ ...prev, [id]: undefined }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const validationErrors = validate(formData)
        const firstInvalid = fieldOrder.find((key) => validationErrors[key])

        if (firstInvalid) {
            setErrors(validationErrors)
            document.getElementById(firstInvalid)?.focus()
            return
        }

        const payload: SignupPayload = {
            username: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            // login lowercases the email, so store it lowercased or the new account can't log in
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            phone: `${countryCode}${formData.phone}`,
            city: formData.city.trim(),
            country: formData.country.trim(),
        }

        try {
            await dispatch(sendSignupOtp(payload)).unwrap()
            toast.success(`Verification code sent to ${payload.email}`)
            setPendingSignup({ payload, sentAt: Date.now(), step: "email" })
        } catch (error) {
            const message = typeof error === "string" ? error : "Could not send the code. Please try again."
            const conflictField = fieldForConflict(message)

            if (conflictField) {
                setErrors({ [conflictField]: message })
                document.getElementById(conflictField)?.focus()
            } else {
                toast.error(message)
            }
        }
    }

    const handleVerified = () => {
        if (!pendingSignup) return

        if (pendingSignup.step === "email") {
            toast.success("Email verified. Now verify your mobile number.")
            setPendingSignup({ ...pendingSignup, step: "phone" })
            return
        }

        const { email } = pendingSignup.payload

        toast.success("Account created. Please log in to continue.")

        // start the tab fresh, so coming back to Sign up doesn't show the old details or code step
        setPendingSignup(null)
        setFormData(initialFormData)
        setErrors({})

        onAccountCreated(email)
    }

    if (pendingSignup) {
        return (
            // keyed by step so the phone step starts with empty boxes and fresh error state
            <RegistrationOtpStep
                key={pendingSignup.step}
                channel={pendingSignup.step}
                payload={pendingSignup.payload}
                sentAt={pendingSignup.sentAt}
                onEditDetails={() => setPendingSignup(null)}
                // a fresh code resets the backend's email verification, so always restart at the email step
                onResent={(sentAt) => setPendingSignup((prev) => prev && { ...prev, sentAt, step: "email" })}
                onVerified={handleVerified}
            />
        )
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
            <AuthField
                id="email"
                label="Email address"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
            />

            <AuthField
                id="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                maxLength={64}
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
            />

            <AuthField
                id="confirmPassword"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                maxLength={64}
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                <AuthField
                    id="firstName"
                    label="First name"
                    autoComplete="given-name"
                    maxLength={50}
                    value={formData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                />
                <AuthField
                    id="lastName"
                    label="Last name"
                    autoComplete="family-name"
                    maxLength={50}
                    value={formData.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                />
            </div>

            <div>
                <label htmlFor="phone" className={authLabelClass}>
                    Mobile number
                </label>
                <div className="flex">
                    <select
                        aria-label="Country code"
                        value={countryCode}
                        onChange={(event) => setCountryCode(event.target.value)}
                        className={cn(
                            authInputClass,
                            "w-24 shrink-0 cursor-pointer border-r-0 px-2.5",
                            errors.phone && authInputErrorClass
                        )}
                    >
                        {COUNTRY_CODES.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.value}
                            </option>
                        ))}
                    </select>
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={formData.phone}
                        onChange={handleChange}
                        aria-invalid={errors.phone ? true : undefined}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                        className={cn(authInputClass, errors.phone && authInputErrorClass)}
                    />
                </div>
                <AuthFieldError id="phone-error" message={errors.phone} />
            </div>

            <AuthField
                id="city"
                label="City"
                autoComplete="address-level2"
                maxLength={100}
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
            />

            <AuthField
                id="country"
                label="Country"
                autoComplete="country-name"
                maxLength={100}
                value={formData.country}
                onChange={handleChange}
                error={errors.country}
            />

            <div>
                <label htmlFor="terms" className="flex cursor-pointer items-start gap-3 text-xs text-neutral-500">
                    <input
                        id="terms"
                        type="checkbox"
                        checked={formData.terms}
                        onChange={(event) => {
                            const checked = event.target.checked
                            setFormData((prev) => ({ ...prev, terms: checked }))
                            setErrors((prev) => ({ ...prev, terms: undefined }))
                        }}
                        aria-invalid={errors.terms ? true : undefined}
                        aria-describedby={errors.terms ? "terms-error" : undefined}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-neutral-900"
                    />
                    <span>
                        I agree to the{" "}
                        <Link href="/terms" className="text-neutral-900 underline underline-offset-2">
                            Terms of Service
                        </Link>
                    </span>
                </label>
                <AuthFieldError id="terms-error" message={errors.terms} />
            </div>

            <AuthSubmitButton loading={loading} loadingText="Sending code...">
                Create account
            </AuthSubmitButton>
        </form>
    )
}
