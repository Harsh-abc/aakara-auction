"use client"

import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import toast from "react-hot-toast"
import {
    BadgeCheckIcon,
    CalendarIcon,
    CameraIcon,
    CheckIcon,
    CircleAlertIcon,
    CircleUserRoundIcon,
    ImageUpIcon,
    Loader2Icon,
    MailIcon,
    MapPinIcon,
    PhoneIcon,
    RotateCcwIcon,
    SparklesIcon,
    UserIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { getMyProfile, updateMyProfile } from "@/services/operations/profile.api"
import { getErrorMessage } from "@/lib/apiError"
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

const GENDER_OPTIONS = [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
    { value: "", label: "Prefer not to say" },
]

const SECTIONS = [
    { id: "photo", label: "Photo", icon: CameraIcon },
    { id: "identity", label: "Identity", icon: UserIcon },
    { id: "about", label: "About you", icon: SparklesIcon },
    { id: "address", label: "Address", icon: MapPinIcon },
    { id: "account", label: "Account", icon: CircleUserRoundIcon },
]

const inputClass = "h-10"

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
    const [dragging, setDragging] = useState(false)
    const [activeSection, setActiveSection] = useState(SECTIONS[0].id)

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

    // highlight the section nav item for whichever section is on screen
    useEffect(() => {
        if (loading) return
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find((entry) => entry.isIntersecting)
                if (visible) setActiveSection(visible.target.id)
            },
            { rootMargin: "-20% 0px -70% 0px" }
        )
        SECTIONS.forEach(({ id }) => {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })
        return () => observer.disconnect()
    }, [loading])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target
        let { value } = e.target
        if (name === "pincode") value = value.replace(/\D/g, "").slice(0, 6)
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const pickAvatar = (file: File | undefined) => {
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

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        pickAvatar(e.target.files?.[0])
        e.target.value = ""
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        pickAvatar(e.dataTransfer.files?.[0])
    }

    const undoAvatar = () => {
        setAvatarFile(null)
        setAvatarPreview(savedAvatarUrl)
    }

    const handleReset = () => {
        setForm(initialForm)
        undoAvatar()
    }

    const changedCount =
        (Object.keys(form) as (keyof ProfileForm)[]).filter((key) => form[key] !== initialForm[key]).length +
        (avatarFile ? 1 : 0)
    const isDirty = changedCount > 0

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

    const scrollTo = (id: string) => {
        setActiveSection(id)
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
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

    // what's still missing, shown as a checklist under the section nav
    const checklist = [
        { label: "Profile photo", done: !!avatarPreview, section: "photo" },
        { label: "Full name", done: !!(form.firstName && form.lastName), section: "identity" },
        { label: "Display name", done: !!form.displayName, section: "identity" },
        { label: "Bio", done: !!form.bio, section: "about" },
        { label: "Date of birth", done: !!form.dateOfBirth, section: "about" },
        {
            label: "Full address",
            done: !!(form.address && form.city && form.state && form.country && form.pincode),
            section: "address",
        },
    ]

    const memberSince = account?.createdAt
        ? new Date(account.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
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
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-6xl py-6 md:px-4 md:py-8">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
            />

            {/* ───────── HERO ───────── */}
            <section className="relative overflow-hidden rounded-3xl bg-[#491B3A] text-white shadow-lg">
                {/* decorative layers */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(176,141,87,0.55),transparent_45%),radial-gradient(circle_at_10%_110%,rgba(109,43,87,0.9),transparent_50%)]" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:32px_32px]" />

                <div className="relative flex flex-col gap-8 p-6 md:flex-row md:items-center md:justify-between md:p-10">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="group relative w-fit rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b08d57]/60"
                            aria-label="Change profile photo"
                        >
                            <Avatar className="size-24 ring-4 ring-white/20 md:size-28">
                                <AvatarImage src={avatarPreview ?? undefined} alt="Profile photo" className="object-cover" />
                                <AvatarFallback className="bg-[#b08d57] text-2xl font-semibold text-white">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-4 border-[#491B3A] bg-[#b08d57] text-white transition-transform group-hover:scale-110">
                                <CameraIcon className="size-4" />
                            </span>
                        </button>

                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#e2c9a0]">
                                General settings
                            </p>
                            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight md:text-4xl">{liveName}</h1>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                                <span>@{account?.username}</span>
                                {account?.role?.name && (
                                    <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium capitalize tracking-wide text-white">
                                        {account.role.name.replace("_", " ").toLowerCase()}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5">
                                    <CalendarIcon className="size-3.5" /> Joined {memberSince}
                                </span>
                            </div>
                        </div>
                    </div>

                    <CompletionRing value={completion} />
                </div>
            </section>

            <div className="mt-8 grid items-start gap-8 lg:grid-cols-[220px_1fr]">
                {/* ───────── SECTION NAV ───────── */}
                <aside className="hidden lg:sticky lg:top-6 lg:block">
                    <nav className="space-y-1">
                        {SECTIONS.map(({ id, label, icon: Icon }) => {
                            const active = activeSection === id
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => scrollTo(id)}
                                    className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active
                                        ? "bg-[#491B3A]/10 font-medium text-[#491B3A] dark:bg-white/10 dark:text-white"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    {active && (
                                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#b08d57]" />
                                    )}
                                    <Icon className="size-4" />
                                    {label}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="mt-8 rounded-xl border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                            Checklist
                        </p>
                        <ul className="mt-3 space-y-2">
                            {checklist.map((item) => (
                                <li key={item.label}>
                                    <button
                                        type="button"
                                        onClick={() => scrollTo(item.section)}
                                        className="flex w-full items-center gap-2 text-left text-sm"
                                    >
                                        <span
                                            className={`flex size-4 shrink-0 items-center justify-center rounded-full ${item.done
                                                ? "bg-emerald-600 text-white"
                                                : "border border-dashed border-muted-foreground/50"
                                                }`}
                                        >
                                            {item.done && <CheckIcon className="size-3" />}
                                        </span>
                                        <span
                                            className={
                                                item.done ? "text-muted-foreground line-through" : "hover:underline"
                                            }
                                        >
                                            {item.label}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* ───────── CONTENT ───────── */}
                <div className="space-y-6">
                    {/* PHOTO */}
                    <Panel id="photo" title="Profile photo" description="Shown in the sidebar, on your bids and to staff.">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                            <Avatar className="size-20 shrink-0 shadow-sm">
                                <AvatarImage src={avatarPreview ?? undefined} alt="Profile photo preview" className="object-cover" />
                                <AvatarFallback className="bg-[#491B3A] text-xl text-white">{initials}</AvatarFallback>
                            </Avatar>

                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        fileInputRef.current?.click()
                                    }
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    setDragging(true)
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                className={`flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${dragging
                                    ? "border-[#b08d57] bg-[#b08d57]/10"
                                    : "border-border hover:border-[#491B3A]/40 hover:bg-muted/40"
                                    }`}
                            >
                                <ImageUpIcon className="size-6 text-[#b08d57]" />
                                <p className="mt-2 text-sm font-medium">
                                    {avatarFile ? avatarFile.name : "Drop a photo here or click to browse"}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {avatarFile ? "Will upload when you save" : "JPG, PNG or WEBP · max 2 MB"}
                                </p>
                            </div>

                            {avatarFile && (
                                <Button type="button" variant="ghost" size="sm" onClick={undoAvatar} className="self-start sm:self-center">
                                    <RotateCcwIcon className="size-3.5" />
                                    Undo
                                </Button>
                            )}
                        </div>
                    </Panel>

                    {/* IDENTITY */}
                    <Panel id="identity" title="Identity" description="How you appear to other users and staff.">
                        <Row label="Legal name" description="Used on invoices and for verification.">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="First name" htmlFor="firstName">
                                    <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} maxLength={50} className={inputClass} />
                                </Field>
                                <Field label="Last name" htmlFor="lastName">
                                    <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} maxLength={50} className={inputClass} />
                                </Field>
                            </div>
                        </Row>
                        <Row label="Display name" description="Shown in the sidebar and next to your bids.">
                            <Input
                                id="displayName"
                                name="displayName"
                                aria-label="Display name"
                                value={form.displayName}
                                onChange={handleChange}
                                maxLength={60}
                                placeholder={[form.firstName, form.lastName].filter(Boolean).join(" ") || "e.g. Aakara Collector"}
                                className={inputClass}
                            />
                            {/* live preview of how the name shows up */}
                            <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                                <Avatar className="size-8">
                                    <AvatarImage src={avatarPreview ?? undefined} alt="" className="object-cover" />
                                    <AvatarFallback className="bg-[#491B3A] text-xs text-white">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 text-sm leading-tight">
                                    <p className="truncate font-medium">{liveName}</p>
                                    <p className="truncate text-xs text-muted-foreground">{account?.email}</p>
                                </div>
                                <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    Preview
                                </span>
                            </div>
                        </Row>
                    </Panel>

                    {/* ABOUT */}
                    <Panel id="about" title="About you" description="Optional details that help staff know you better.">
                        <Row label="Gender">
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Gender">
                                {GENDER_OPTIONS.map((option) => {
                                    const selected = form.gender === option.value
                                    return (
                                        <button
                                            key={option.label}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            onClick={() => setForm((prev) => ({ ...prev, gender: option.value }))}
                                            className={`h-9 rounded-full border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${selected
                                                ? "border-[#491B3A] bg-[#491B3A] text-white"
                                                : "bg-background hover:bg-muted"
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </Row>
                        <Row label="Date of birth">
                            <Input
                                id="dateOfBirth"
                                name="dateOfBirth"
                                type="date"
                                aria-label="Date of birth"
                                max={today}
                                value={form.dateOfBirth}
                                onChange={handleChange}
                                className={`${inputClass} sm:max-w-xs`}
                            />
                        </Row>
                        <Row label="Bio" description="A few lines about you and your collection.">
                            <Textarea
                                id="bio"
                                name="bio"
                                aria-label="Bio"
                                rows={5}
                                value={form.bio}
                                onChange={handleChange}
                                maxLength={500}
                                placeholder="I collect modern Indian art, with a soft spot for…"
                                className="resize-none"
                            />
                            <div className="mt-2 flex items-center gap-3">
                                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={`h-full rounded-full transition-all ${form.bio.length > 450 ? "bg-amber-500" : "bg-[#b08d57]"}`}
                                        style={{ width: `${(form.bio.length / 500) * 100}%` }}
                                    />
                                </div>
                                <span className="font-mono text-xs text-muted-foreground">{form.bio.length}/500</span>
                            </div>
                        </Row>
                    </Panel>

                    {/* ADDRESS */}
                    <Panel id="address" title="Address" description="Used for invoices and shipping won lots.">
                        <Row label="Street address">
                            <Input
                                id="address"
                                name="address"
                                aria-label="Street address"
                                value={form.address}
                                onChange={handleChange}
                                maxLength={255}
                                placeholder="House / flat, street, area"
                                className={inputClass}
                            />
                        </Row>
                        <Row label="Locality">
                            <div className="grid gap-4 sm:grid-cols-2">
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
                                    <Input
                                        id="pincode"
                                        name="pincode"
                                        inputMode="numeric"
                                        value={form.pincode}
                                        onChange={handleChange}
                                        placeholder="6 digits"
                                        className={`${inputClass} font-mono tracking-widest`}
                                    />
                                </Field>
                            </div>
                        </Row>
                    </Panel>

                    {/* ACCOUNT (read-only) */}
                    <Panel id="account" title="Account" description="Login details linked to this account.">
                        <div className="grid gap-3 py-4 sm:grid-cols-2">
                            <AccountTile
                                icon={<MailIcon className="size-4" />}
                                label="Email"
                                value={account?.email ?? "—"}
                                verified={account?.emailVerified}
                            />
                            <AccountTile
                                icon={<PhoneIcon className="size-4" />}
                                label="Phone"
                                value={account?.phone ?? "No phone added"}
                                verified={account?.phone ? account.phoneVerified : undefined}
                            />
                        </div>
                    </Panel>

                    {/* FLOATING SAVE BAR — only visible with unsaved changes */}
                    <div
                        className={`sticky bottom-6 z-10 mx-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-full bg-[#491B3A] py-2 pl-5 pr-2 text-white shadow-2xl shadow-[#491B3A]/30 transition-all duration-300 ${isDirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
                            }`}
                    >
                        <span className="flex items-center gap-2 text-sm">
                            <span className="size-2 animate-pulse rounded-full bg-[#e2c9a0]" />
                            {changedCount} unsaved {changedCount === 1 ? "change" : "changes"}
                        </span>
                        <div className="flex gap-1.5">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleReset}
                                disabled={saving}
                                className="rounded-full text-white hover:bg-white/10 hover:text-white"
                            >
                                Discard
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="rounded-full bg-[#b08d57] px-4 text-white hover:bg-[#b08d57]/90"
                            >
                                {saving && <Loader2Icon className="size-4 animate-spin" />}
                                {saving ? "Saving…" : "Save changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    )
}

function CompletionRing({ value }: { value: number }) {
    const radius = 34
    const circumference = 2 * Math.PI * radius
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
            <div className="relative size-20 shrink-0">
                <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                    <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/15" />
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="none"
                        stroke="#e2c9a0"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - value / 100)}
                        className="transition-[stroke-dashoffset] duration-700"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-semibold">
                    {value}%
                </span>
            </div>
            <div className="max-w-[11rem]">
                <p className="text-sm font-medium">{value === 100 ? "Profile complete" : "Profile strength"}</p>
                <p className="mt-0.5 text-xs text-white/60">
                    {value === 100
                        ? "Staff can verify you quickly for auctions."
                        : "A complete profile helps staff verify you faster."}
                </p>
            </div>
        </div>
    )
}

function Panel({
    id,
    title,
    description,
    children,
}: {
    id: string
    title: string
    description: string
    children: React.ReactNode
}) {
    return (
        <section id={id} className="scroll-mt-6 rounded-2xl border bg-card shadow-sm">
            <div className="px-6 pt-6">
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="divide-y px-6 pb-2 pt-4">{children}</div>
        </section>
    )
}

// label on the left, controls on the right
function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-3 py-5 first:pt-2 md:grid-cols-[200px_1fr] md:gap-8">
            <div>
                <p className="text-sm font-medium">{label}</p>
                {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={htmlFor} className="text-xs font-normal text-muted-foreground">
                {label}
            </Label>
            {children}
        </div>
    )
}

function AccountTile({
    icon,
    label,
    value,
    verified,
}: {
    icon: React.ReactNode
    label: string
    value: string
    verified?: boolean
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-medium">{value}</p>
            </div>
            {verified === true && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                    <BadgeCheckIcon className="size-4" /> Verified
                </span>
            )}
            {verified === false && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-amber-600">
                    <CircleAlertIcon className="size-3.5" /> Unverified
                </span>
            )}
        </div>
    )
}
