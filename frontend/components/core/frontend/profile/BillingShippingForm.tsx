"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { updateMyProfile } from "@/services/operations/profile.api"
import type { MyAccount, UpdateProfilePayload } from "@/lib/types/profile.types"
import { cn } from "@/lib/utils"
import {
    AuthField,
    AuthFieldError,
    authInputClass,
    authInputErrorClass,
    authLabelClass,
} from "@/components/core/auth/registration/AuthField"
import { getErrorMessage } from "@/lib/apiError"
import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, BUTTON_SOLID, EYEBROW } from "../storefront"
import { ProfileButton, ProfileSection } from "./ProfileUI"

/*
 * Figma "Billing and shipping": saved addresses, which one bills and which one ships, and tax details.
 * The API keeps a single address on the profile, so for now only the billing address is saved (to the profile);
 * the address book, shipping choice and tax details live in this form until their endpoints exist.
 */

type Address = {
    id: string
    label: string
    address: string
    city: string
    state: string
    country: string
    pincode: string
}

type AddressDraft = Omit<Address, "id">
type AddressKey = keyof AddressDraft
type AddressErrors = Partial<Record<AddressKey, string>>

const EMPTY_DRAFT: AddressDraft = { label: "", address: "", city: "", state: "", country: "", pincode: "" }

// the address fields the profile stores, in the order they're checked
const PROFILE_FIELDS = ["address", "city", "state", "country", "pincode"] as const

const ADDRESS_ORDER: AddressKey[] = ["label", ...PROFILE_FIELDS]

// "14 Rampart Row, Kala Ghoda, Mumbai, Maharashtra 400001, India"
const formatAddress = (a: AddressDraft) =>
    [a.address, a.city, [a.state, a.pincode].filter(Boolean).join(" "), a.country].filter(Boolean).join(", ")

// limits mirror updateMyProfileSchema on the backend
function validateAddress(draft: AddressDraft): AddressErrors {
    const errors: AddressErrors = {}
    if (!draft.label.trim()) errors.label = "Name this address, e.g. Home or Office"
    if (!draft.address.trim()) errors.address = "Enter your street address"
    if (!draft.city.trim()) errors.city = "Enter your city"
    if (!draft.state.trim()) errors.state = "Enter your state"
    if (!draft.country.trim()) errors.country = "Enter your country"
    if (!draft.pincode) errors.pincode = "Enter your pincode"
    else if (draft.pincode.length !== 6) errors.pincode = "Pincode must be 6 digits"
    return errors
}

const TAX_TYPES = {
    PAN: {
        label: "PAN number",
        maxLength: 10,
        pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
        hint: "10 characters, e.g. ABCDE1234F. Used on invoices and for buyer's premium tax calculation.",
    },
    GSTIN: {
        label: "GSTIN",
        maxLength: 15,
        pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
        hint: "15 characters, e.g. 27ABCDE1234F1Z5. Used on invoices and for buyer's premium tax calculation.",
    },
} as const

type TaxType = keyof typeof TAX_TYPES

// the profile's one stored address becomes the first saved address, used for billing and shipping
function initialAddresses(account: MyAccount): Address[] {
    const profile = account.profile
    if (!profile?.address) return []
    return [
        {
            id: "profile",
            label: "Home",
            address: profile.address ?? "",
            city: profile.city ?? "",
            state: profile.state ?? "",
            country: profile.country ?? "",
            pincode: profile.pincode ?? "",
        },
    ]
}

function SelectField({
    id,
    label,
    value,
    onChange,
    disabled,
    error,
    children,
}: {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    error?: string
    children: React.ReactNode
}) {
    return (
        <div>
            <label htmlFor={id} className={authLabelClass}>
                {label}
            </label>
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={cn(authInputClass, "cursor-pointer appearance-none truncate pr-10", error && authInputErrorClass)}
                >
                    {children}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[#717171]" />
            </div>
            <AuthFieldError id={`${id}-error`} message={error} />
        </div>
    )
}

// add / edit one saved address, in place
function AddressEditor({
    initial,
    onSave,
    onCancel,
}: {
    initial: AddressDraft
    onSave: (draft: AddressDraft) => void
    onCancel: () => void
}) {
    const [draft, setDraft] = useState(initial)
    const [errors, setErrors] = useState<AddressErrors>({})

    const fieldId = (key: AddressKey) => `address-${key}`

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const key = event.target.name as AddressKey
        const value = key === "pincode" ? event.target.value.replace(/\D/g, "").slice(0, 6) : event.target.value
        setDraft((prev) => ({ ...prev, [key]: value }))
        setErrors((prev) => ({ ...prev, [key]: undefined }))
    }

    const handleSave = () => {
        const validationErrors = validateAddress(draft)
        const firstInvalid = ADDRESS_ORDER.find((key) => validationErrors[key])
        if (firstInvalid) {
            setErrors(validationErrors)
            document.getElementById(fieldId(firstInvalid))?.focus()
            return
        }
        onSave({
            label: draft.label.trim(),
            address: draft.address.trim(),
            city: draft.city.trim(),
            state: draft.state.trim(),
            country: draft.country.trim(),
            pincode: draft.pincode,
        })
    }

    const field = (key: AddressKey, label: string, props: React.ComponentProps<"input"> = {}) => (
        <AuthField
            id={fieldId(key)}
            name={key}
            label={label}
            value={draft[key]}
            onChange={handleChange}
            error={errors[key]}
            {...props}
        />
    )

    return (
        <div className="flex flex-col gap-4 border border-[#cecece] bg-white p-5">
            {field("label", "Address name", { placeholder: "e.g. Home, Office", maxLength: 40 })}
            {field("address", "Street address", { placeholder: "House / flat, street, area", autoComplete: "street-address", maxLength: 255 })}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {field("city", "City", { autoComplete: "address-level2", maxLength: 100 })}
                {field("state", "State", { autoComplete: "address-level1", maxLength: 100 })}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {field("country", "Country", { autoComplete: "country-name", maxLength: 100 })}
                {field("pincode", "Pincode", { placeholder: "6 digits", inputMode: "numeric", autoComplete: "postal-code" })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={handleSave} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE)}>
                    Save address
                </button>
                <button type="button" onClick={onCancel} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}>
                    Cancel
                </button>
            </div>
        </div>
    )
}

type BillingShippingFormProps = {
    account: MyAccount
    onSaved: (account: MyAccount) => void
}

export function BillingShippingForm({ account, onSaved }: BillingShippingFormProps) {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [addresses, setAddresses] = useState<Address[]>(() => initialAddresses(account))
    // "new" while adding, an address id while editing that one
    const [editing, setEditing] = useState<string | null>(null)

    const [billingId, setBillingId] = useState(() => addresses[0]?.id ?? "")
    const [shippingId, setShippingId] = useState(() => addresses[0]?.id ?? "")
    const [shipToBilling, setShipToBilling] = useState(true)

    const [taxType, setTaxType] = useState<TaxType>("PAN")
    const [taxNumber, setTaxNumber] = useState("")
    const [businessName, setBusinessName] = useState("")

    const [errors, setErrors] = useState<{ billing?: string; shipping?: string; taxNumber?: string }>({})
    const [saving, setSaving] = useState(false)

    const effectiveShippingId = shipToBilling ? billingId : shippingId
    const tax = TAX_TYPES[taxType]

    const saveAddress = (draft: AddressDraft) => {
        if (editing === "new") {
            const id = crypto.randomUUID()
            setAddresses((prev) => [...prev, { id, ...draft }])
            // the first address does both jobs until the user says otherwise
            if (!billingId) setBillingId(id)
            if (!shippingId) setShippingId(id)
            setErrors((prev) => ({ ...prev, billing: undefined, shipping: undefined }))
        } else {
            setAddresses((prev) => prev.map((item) => (item.id === editing ? { ...item, ...draft } : item)))
        }
        setEditing(null)
    }

    const removeAddress = (id: string) => {
        setAddresses((prev) => prev.filter((item) => item.id !== id))
        if (billingId === id) setBillingId("")
        if (shippingId === id) setShippingId("")
        if (editing === id) setEditing(null)
    }

    // while "Ship to my billing address" is ticked, shipping follows billing
    const chooseBilling = (id: string) => {
        setBillingId(id)
        setErrors((prev) => ({ ...prev, billing: undefined }))
    }

    const chooseShipping = (id: string) => {
        setShippingId(id)
        setShipToBilling(id === billingId)
        setErrors((prev) => ({ ...prev, shipping: undefined }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const nextErrors: typeof errors = {}
        if (!billingId) nextErrors.billing = "Choose a billing address"
        if (!effectiveShippingId) nextErrors.shipping = "Choose a shipping address"
        if (taxNumber && !tax.pattern.test(taxNumber)) nextErrors.taxNumber = `Enter a valid ${tax.label}`

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors)
            const firstInvalid = nextErrors.billing ? "billing-address" : nextErrors.shipping ? "shipping-address" : "tax-number"
            document.getElementById(firstInvalid)?.focus()
            return
        }

        // the billing address is the one the profile stores; only send what changed
        const billing = addresses.find((item) => item.id === billingId)
        const payload: UpdateProfilePayload = {}
        if (billing) {
            PROFILE_FIELDS.forEach((key) => {
                if (billing[key] !== (account.profile?.[key] ?? "")) payload[key] = billing[key]
            })
        }

        // TODO: save the address book, shipping address and tax details once their APIs exist
        if (Object.keys(payload).length === 0) {
            toast.success("Your billing & shipping details have been saved")
            return
        }

        setSaving(true)

        try {
            const profile = await updateMyProfile(payload, token)
            onSaved({ ...account, profile })
            toast.success("Your billing & shipping details have been saved")
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setSaving(false)
        }
    }

    const addressOptions = (
        <>
            <option value="" disabled>
                {addresses.length === 0 ? "Add an address first" : "Select an address"}
            </option>
            {addresses.map((item) => (
                <option key={item.id} value={item.id}>
                    {item.label} — {formatAddress(item)}
                </option>
            ))}
        </>
    )

    return (
        <div className="flex flex-col gap-12">
            <ProfileSection
                title="Saved addresses"
                action={
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        disabled={editing !== null}
                        className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}
                    >
                        + Add address
                    </button>
                }
            >
                <div className="flex max-w-180 flex-col gap-3">
                    {addresses.length === 0 && editing !== "new" && (
                        <p className={BODY}>No saved addresses yet. Add one to use it for billing and shipping.</p>
                    )}

                    {addresses.map((item) =>
                        editing === item.id ? (
                            <AddressEditor key={item.id} initial={item} onSave={saveAddress} onCancel={() => setEditing(null)} />
                        ) : (
                            <div key={item.id} className="flex flex-col gap-3 py-4.25 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                                <div className="flex min-w-0 flex-col gap-1">
                                    <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">
                                        {item.label}
                                        {(item.id === billingId || item.id === effectiveShippingId) && (
                                            <span className={cn(EYEBROW, "ml-2.5")}>
                                                {[item.id === billingId && "Billing", item.id === effectiveShippingId && "Shipping"].filter(Boolean).join(" · ")}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-[14px] leading-5 text-[#717171]">{formatAddress(item)}</p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    {item.id !== billingId && (
                                        <button type="button" onClick={() => chooseBilling(item.id)} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}>
                                            Use for billing
                                        </button>
                                    )}
                                    {item.id !== effectiveShippingId && (
                                        <button type="button" onClick={() => chooseShipping(item.id)} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}>
                                            Use for shipping
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setEditing(item.id)}
                                        disabled={editing !== null}
                                        className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}
                                    >
                                        Edit
                                    </button>
                                    <button type="button" onClick={() => removeAddress(item.id)} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )
                    )}

                    {editing === "new" && <AddressEditor initial={EMPTY_DRAFT} onSave={saveAddress} onCancel={() => setEditing(null)} />}
                </div>
            </ProfileSection>

            <form onSubmit={handleSubmit} className="flex flex-col gap-12" noValidate>
                <ProfileSection title="Billing & shipping">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SelectField
                            id="billing-address"
                            label="Billing address"
                            value={billingId}
                            onChange={(id) => chooseBilling(id)}
                            disabled={addresses.length === 0}
                            error={errors.billing}
                        >
                            {addressOptions}
                        </SelectField>
                        <SelectField
                            id="shipping-address"
                            label="Shipping address"
                            value={effectiveShippingId}
                            onChange={(id) => chooseShipping(id)}
                            disabled={addresses.length === 0 || shipToBilling}
                            error={errors.shipping}
                        >
                            {addressOptions}
                        </SelectField>
                    </div>

                    <label htmlFor="ship-to-billing" className="mt-4 flex w-fit cursor-pointer items-center gap-3 text-[14px] leading-5">
                        <input
                            id="ship-to-billing"
                            type="checkbox"
                            checked={shipToBilling}
                            onChange={(event) => {
                                const checked = event.target.checked
                                // unticking starts shipping from the billing address, ready to change
                                if (!checked) setShippingId(billingId)
                                setShipToBilling(checked)
                                setErrors((prev) => ({ ...prev, shipping: undefined }))
                            }}
                            className="size-4.5 shrink-0 cursor-pointer rounded-none accent-[#0d0d0d]"
                        />
                        Ship to my billing address
                    </label>
                </ProfileSection>

                <ProfileSection title="Tax details">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <SelectField
                                id="tax-type"
                                label="Tax ID type"
                                value={taxType}
                                onChange={(value) => {
                                    setTaxType(value as TaxType)
                                    setTaxNumber("")
                                    setErrors((prev) => ({ ...prev, taxNumber: undefined }))
                                }}
                            >
                                {(Object.keys(TAX_TYPES) as TaxType[]).map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </SelectField>
                            <AuthField
                                id="tax-number"
                                name="taxNumber"
                                label={tax.label}
                                placeholder={taxType === "PAN" ? "ABCDE1234F" : "27ABCDE1234F1Z5"}
                                maxLength={tax.maxLength}
                                value={taxNumber}
                                onChange={(event) => {
                                    setTaxNumber(event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))
                                    setErrors((prev) => ({ ...prev, taxNumber: undefined }))
                                }}
                                error={errors.taxNumber}
                            />
                        </div>
                        <AuthField
                            id="business-name"
                            name="businessName"
                            label="Business name for invoices (optional)"
                            autoComplete="organization"
                            maxLength={150}
                            value={businessName}
                            onChange={(event) => setBusinessName(event.target.value)}
                        />
                        <p className={EYEBROW}>{tax.hint}</p>
                    </div>
                </ProfileSection>

                <div className="-mt-6">
                    <ProfileButton loading={saving} loadingText="Saving...">
                        Save changes
                    </ProfileButton>
                </div>
            </form>
        </div>
    )
}
