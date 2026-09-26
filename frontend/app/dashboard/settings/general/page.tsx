"use client"

import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import axios from "axios"
import toast from "react-hot-toast"
import {
    BadgeCheckIcon,
    CalendarIcon,
    CameraIcon,
    Loader2Icon,
    MailIcon,
    MapPinIcon,
    PhoneIcon,
    UserIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { getMyProfile, updateMyProfile } from "@/services/operations/profile.api"
import { MyAccount, UserProfile } from "@/lib/types/profile.types"
import { setUser } from "@/redux/slices/authSlice"
import type { RootState } from "@/redux/store"

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]
const AVATAR_MAX_SIZE = 2 * 1024 * 1024

const EMPTY_FORM = {
    firstName: "",
    lastName: "",
    displayName: "",
    bio: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
}

type ProfileForm = typeof EMPTY_FORM

const toForm = (profile: UserProfile | null): ProfileForm => ({
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    displayName: profile?.displayName ?? "",
    bio: profile?.bio ?? "",
    gender: profile?.gender ?? "",
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "",
    address: profile?.address ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    country: profile?.country ?? "",
    pincode: profile?.pincode ?? "",
})

const getErrorMessage = (err: unknown) =>
    axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : "Something went wrong"

const inputClass = "h-10"
const selectClass =
    "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export default function General() {
    const dispatch = useDispatch()
    const authUser = useSelector((state: RootState) => state.auth.user)
    const token = useSelector((state: RootState) => state.auth.accessToken)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [account, setAccount] = useState<MyAccount | null>(null)
    const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
    const [initialForm, setInitialForm] = useState<ProfileForm>(EMPTY_FORM)
    const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // load profile
    useEffect(() => {
        if (!token) return
        getMyProfile(token)
            .then((data) => {
                const values = toForm(data.profile)
                setAccount(data)
                setForm(values)
                setInitialForm(values)
                setSavedAvatarUrl(data.profile?.avatarUrl ?? null)
                setAvatarPreview(data.profile?.avatarUrl ?? null)
            })
            .catch((err) => toast.error(getErrorMessage(err)))
            .finally(() => setLoading(false))
    }, [token])

    useEffect(() => {
        return () => {
            if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
        }
    }, [avatarPreview])

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name } = e.target
        let { value } = e.target
        if (name === "pincode") value = value.replace(/\D/g, "").slice(0, 6)
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return

        if (!AVATAR_TYPES.includes(file.type)) {
            toast.error("Photo must be JPG, PNG or WEBP")
            return
        }
        if (file.size > AVATAR_MAX_SIZE) {
            toast.error("Photo must be 2 MB or smaller")
            return
        }

        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    const undoAvatar = () => {
        setAvatarFile(null)
        setAvatarPreview(savedAvatarUrl)
    }

    const handleReset = () => {
        setForm(initialForm)
        undoAvatar()
    }

    const isDirty = !!avatarFile || JSON.stringify(form) !== JSON.stringify(initialForm)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (form.pincode && form.pincode.length !== 6) {
            toast.error("Pincode must be 6 digits")
            return
        }

        const formData = new FormData()
        Object.entries(form).forEach(([key, value]) => formData.append(key, value.trim()))
        if (avatarFile) formData.append("avatar", avatarFile)

        setSaving(true)
        const toastId = toast.loading(avatarFile ? "Uploading photo & saving…" : "Saving profile…")

        try {
            const profile = await updateMyProfile(formData, token)
            const values = toForm(profile)

            setForm(values)
            setInitialForm(values)
            setAvatarFile(null)
            setSavedAvatarUrl(profile.avatarUrl)
            setAvatarPreview(profile.avatarUrl)

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

            toast.success("Profile updated", { id: toastId })
        } catch (err) {
            toast.error(getErrorMessage(err), { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    // ── derived UI values ──
    const liveName =
        form.displayName || [form.firstName, form.lastName].filter(Boolean).join(" ") || account?.username || "User"
    const initials = liveName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    const completionItems = [...Object.values(form), avatarPreview]
    const completion = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100)

    const memberSince = account?.createdAt
        ? new Date(account.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
        : "—"

    const today = new Date().toISOString().slice(0, 10)

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading profile…
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
            {/* PAGE HEADER */}
            <header className="mb-8">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b08d57]">Settings</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">General</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Manage your profile. Your name and photo appear across Aakara and in the sidebar.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
                {/* ───────── LEFT: PROFILE CARD ───────── */}
                <aside className="lg:sticky lg:top-6">
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        {/* banner */}
                        <div className="h-28 bg-gradient-to-br from-[#491B3A] via-[#6d2b57] to-[#b08d57]" />

                        {/* avatar + name */}
                        <div className="-mt-14 flex flex-col items-center px-6 pb-6 text-center">
                            <div className="group relative">
                                <Avatar className="size-28 ring-4 ring-card shadow-md">
                                    <AvatarImage src={avatarPreview ?? undefined} alt="Profile photo" className="object-cover" />
                                    <AvatarFallback className="bg-[#491B3A] text-2xl text-white">{initials}</AvatarFallback>
                                </Avatar>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                    aria-label="Change profile photo"
                                >
                                    <CameraIcon className="size-6" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                />
                            </div>

                            <h2 className="mt-4 text-xl font-semibold">{liveName}</h2>
                            <p className="text-sm text-muted-foreground">@{account?.username}</p>

                            {account?.role?.name && (
                                <span className="mt-3 rounded-full bg-[#491B3A]/10 px-3 py-1 text-xs font-medium tracking-wide text-[#491B3A] dark:bg-white/10 dark:text-white">
                                    {account.role.name.replace("_", " ")}
                                </span>
                            )}

                            <div className="mt-5 flex flex-wrap justify-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <CameraIcon className="size-4" />
                                    {avatarPreview ? "Change photo" : "Upload photo"}
                                </Button>
                                {avatarFile && (
                                    <Button type="button" variant="ghost" size="sm" onClick={undoAvatar}>
                                        Undo
                                    </Button>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                {avatarFile ? `${avatarFile.name} will upload on save` : "JPG, PNG or WEBP · max 2 MB"}
                            </p>
                        </div>

                        {/* account info */}
                        <div className="space-y-3 border-t px-6 py-5 text-sm">
                            <InfoRow icon={<MailIcon className="size-4" />} label={account?.email ?? "—"}>
                                {account?.emailVerified && (
                                    <BadgeCheckIcon className="size-4 text-emerald-600" aria-label="Verified" />
                                )}
                            </InfoRow>
                            <InfoRow icon={<PhoneIcon className="size-4" />} label={account?.phone ?? "No phone added"}>
                                {account?.phoneVerified && (
                                    <BadgeCheckIcon className="size-4 text-emerald-600" aria-label="Verified" />
                                )}
                            </InfoRow>
                            <InfoRow icon={<CalendarIcon className="size-4" />} label={`Member since ${memberSince}`} />
                        </div>

                        {/* completeness */}
                        <div className="border-t px-6 py-5">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-medium">Profile completeness</span>
                                <span className="font-mono text-muted-foreground">{completion}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#491B3A] to-[#b08d57] transition-all duration-500"
                                    style={{ width: `${completion}%` }}
                                />
                            </div>
                            {completion < 100 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    A complete profile helps staff verify you faster for auctions.
                                </p>
                            )}
                        </div>
                    </div>
                </aside>

                {/* ───────── RIGHT: FORM SECTIONS ───────── */}
                <div className="space-y-6">
                    <Section
                        icon={<UserIcon className="size-5" />}
                        title="Personal details"
                        description="How you appear to other users and staff."
                    >
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            <Field label="First name" htmlFor="firstName">
                                <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} maxLength={50} className={inputClass} />
                            </Field>
                            <Field label="Last name" htmlFor="lastName">
                                <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} maxLength={50} className={inputClass} />
                            </Field>
                            <Field label="Display name" htmlFor="displayName" hint="Shown in sidebar & bids">
                                <Input id="displayName" name="displayName" value={form.displayName} onChange={handleChange} maxLength={60} className={inputClass} />
                            </Field>
                            <Field label="Gender" htmlFor="gender">
                                <select id="gender" name="gender" value={form.gender} onChange={handleChange} className={selectClass}>
                                    <option value="">Prefer not to say</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </Field>
                            <Field label="Date of birth" htmlFor="dateOfBirth">
                                <Input id="dateOfBirth" name="dateOfBirth" type="date" max={today} value={form.dateOfBirth} onChange={handleChange} className={inputClass} />
                            </Field>
                            <div className="sm:col-span-2 xl:col-span-3">
                                <Field label="Bio" htmlFor="bio" hint={`${form.bio.length}/500`}>
                                    <Textarea
                                        id="bio"
                                        name="bio"
                                        rows={4}
                                        value={form.bio}
                                        onChange={handleChange}
                                        maxLength={500}
                                        placeholder="A few lines about you and your collection"
                                        className="resize-none"
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section
                        icon={<MapPinIcon className="size-5" />}
                        title="Address"
                        description="Used for invoices and shipping won lots."
                    >
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="sm:col-span-2 xl:col-span-4">
                                <Field label="Address" htmlFor="address">
                                    <Input id="address" name="address" value={form.address} onChange={handleChange} maxLength={255} placeholder="House / flat, street, area" className={inputClass} />
                                </Field>
                            </div>
                            <Field label="City" htmlFor="city">
                                <Input id="city" name="city" value={form.city} onChange={handleChange} maxLength={100} className={inputClass} />
                            </Field>
                            <Field label="State" htmlFor="state">
                                <Input id="state" name="state" value={form.state} onChange={handleChange} maxLength={100} className={inputClass} />
                            </Field>
                            <Field label="Country" htmlFor="country">
                                <Input id="country" name="country" value={form.country} onChange={handleChange} maxLength={100} className={inputClass} />
                            </Field>
                            <Field label="Pincode" htmlFor="pincode">
                                <Input id="pincode" name="pincode" inputMode="numeric" value={form.pincode} onChange={handleChange} placeholder="6 digits" className={`${inputClass} font-mono tracking-widest`} />
                            </Field>
                        </div>
                    </Section>

                    {/* STICKY SAVE BAR — only visible with unsaved changes */}
                    <div
                        className={`sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border bg-card/95 px-5 py-4 shadow-lg backdrop-blur transition-all duration-300 sm:flex-row sm:items-center sm:justify-between ${isDirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
                            }`}
                    >
                        <div className="flex items-center gap-2 text-sm">
                            <span className="size-2 animate-pulse rounded-full bg-[#b08d57]" />
                            You have unsaved changes
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90">
                                {saving && <Loader2Icon className="size-4 animate-spin" />}
                                {saving ? "Saving…" : "Save changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

function Section({
    icon,
    title,
    description,
    children,
}: {
    icon: React.ReactNode
    title: string
    description: string
    children: React.ReactNode
}) {
    return (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center gap-4 border-b bg-muted/30 px-6 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#491B3A]/10 text-[#491B3A] dark:bg-white/10 dark:text-white">
                    {icon}
                </div>
                <div>
                    <h2 className="font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="p-6">{children}</div>
        </section>
    )
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={htmlFor} className="text-sm font-medium">
                    {label}
                </Label>
                {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            </div>
            {children}
        </div>
    )
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 text-muted-foreground">
            <span className="shrink-0">{icon}</span>
            <span className="truncate text-foreground">{label}</span>
            {children}
        </div>
    )
}