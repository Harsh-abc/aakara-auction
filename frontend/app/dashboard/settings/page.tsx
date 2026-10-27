"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import {
    ArrowRightIcon,
    BadgeCheckIcon,
    BanIcon,
    CalendarIcon,
    CircleAlertIcon,
    GlobeIcon,
    MailIcon,
    MessageSquareWarningIcon,
    PencilIcon,
    PhoneIcon,
    ShieldCheckIcon,
    UserIcon,
    UsersIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAppSelector } from "@/hooks/redux"
import { useCanAccessPage } from "@/hooks/useCanAccessPage"
import { getErrorMessage } from "@/lib/apiError"
import { ROLE_LABELS, type RoleName } from "@/lib/constants/roles"
import { MyAccount } from "@/lib/types/profile.types"
import { getMyProfile } from "@/services/operations/profile.api"

// same fields the General page counts towards completeness
const PROFILE_FIELDS = [
    "firstName",
    "lastName",
    "displayName",
    "bio",
    "gender",
    "dateOfBirth",
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "avatarUrl",
] as const

const SETTINGS_LINKS = [
    {
        title: "General",
        description: "Your name, photo, bio and address used for invoices and shipping.",
        href: "/dashboard/settings/general",
        icon: UserIcon,
    },
    {
        title: "Team",
        description: "See who has dashboard access, add members and change their roles.",
        href: "/dashboard/settings/team",
        icon: UsersIcon,
    },
    {
        title: "Website",
        description: "Homepage hero images shown when no auction is live or scheduled.",
        href: "/dashboard/settings/website",
        icon: GlobeIcon,
    },
    {
        title: "Blocked IPs",
        description: "IP addresses blocked from signing in after failed attempts — unblock them here.",
        href: "/dashboard/settings/blocked-ips",
        icon: BanIcon,
    },
    {
        title: "OTP Limits",
        description: "Emails and phone numbers that hit the sign-up OTP limit — reset them here.",
        href: "/dashboard/settings/otp-limits",
        icon: MessageSquareWarningIcon,
    },
    {
        title: "Roles & Permissions",
        description: "Fine-grained control over what each role can see and do.",
        icon: ShieldCheckIcon,
        comingSoon: true,
    },
]

export default function Settings() {
    const authUser = useAppSelector((state) => state.auth.user)
    const role = useAppSelector((state) => state.auth.role)
    const token = useAppSelector((state) => state.auth.accessToken)
    // e.g. Team is super admin only (lib/constants/dashboardAccess.ts)
    const canAccess = useCanAccessPage()

    const [account, setAccount] = useState<MyAccount | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        getMyProfile(token)
            .then(setAccount)
            .catch((err) => toast.error(getErrorMessage(err)))
            .finally(() => setLoading(false))
    }, [token])

    // fall back to the auth user while the full account loads
    const profile = account?.profile ?? authUser?.profile
    const username = account?.username ?? authUser?.username
    const name =
        profile?.displayName ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
        username ||
        "User"
    const initials = name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    const roleName = account?.role?.name ?? role
    const roleLabel = roleName ? ROLE_LABELS[roleName as RoleName] ?? roleName.replace("_", " ") : null

    const filled = account?.profile ? PROFILE_FIELDS.filter((key) => account.profile?.[key]).length : 0
    const completion = Math.round((filled / PROFILE_FIELDS.length) * 100)

    const memberSince = account?.createdAt
        ? new Date(account.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "—"

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
            {/* PAGE HEADER */}
            <header className="mb-8">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b08d57]">Settings</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings overview</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Manage your profile, your team and how Akara works for you.
                </p>
            </header>

            {/* PROFILE SUMMARY */}
            <section className="relative mb-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="h-24 bg-gradient-to-br from-[#491B3A] via-[#6d2b57] to-[#b08d57] md:h-28" />

                <div className="flex flex-col gap-6 px-6 pb-6 md:flex-row md:items-end md:justify-between">
                    <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
                        <Avatar className="size-24 shrink-0 ring-4 ring-card shadow-md">
                            <AvatarImage src={profile?.avatarUrl ?? undefined} alt="Profile photo" className="object-cover" />
                            <AvatarFallback className="bg-[#491B3A] text-xl text-white">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 pb-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate text-xl font-semibold">{name}</h2>
                                {roleLabel && (
                                    <span className="rounded-full bg-[#491B3A]/10 px-2.5 py-0.5 text-xs font-medium tracking-wide text-[#491B3A] dark:bg-white/10 dark:text-white">
                                        {roleLabel}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {username && `@${username}`}
                                {username && (account?.email ?? authUser?.email) && " · "}
                                {account?.email ?? authUser?.email}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="w-full sm:w-56">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-medium">Profile completeness</span>
                                <span className="font-mono text-muted-foreground">{loading ? "…" : `${completion}%`}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#491B3A] to-[#b08d57] transition-all duration-500"
                                    style={{ width: `${loading ? 0 : completion}%` }}
                                />
                            </div>
                        </div>
                        <Button
                            nativeButton={false}
                            render={<Link href="/dashboard/settings/general" />}
                            className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                        >
                            <PencilIcon className="size-4" />
                            Edit profile
                        </Button>
                    </div>
                </div>
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
                {/* SETTINGS SECTIONS */}
                <div>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
                        Manage
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {SETTINGS_LINKS.filter((link) => !link.href || canAccess(link.href)).map(({ title, description, href, icon: Icon, comingSoon }) => {
                            const body = (
                                <>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#491B3A]/10 text-[#491B3A] transition-colors group-hover:bg-[#491B3A] group-hover:text-white dark:bg-white/10 dark:text-white">
                                            <Icon className="size-5" />
                                        </div>
                                        {comingSoon ? (
                                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                                Coming soon
                                            </span>
                                        ) : (
                                            <ArrowRightIcon className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-[#491B3A] dark:group-hover:text-white" />
                                        )}
                                    </div>
                                    <h3 className="mt-5 font-semibold">{title}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                                </>
                            )

                            return comingSoon || !href ? (
                                <div
                                    key={title}
                                    className="rounded-2xl border border-dashed bg-card/50 p-6 opacity-70"
                                    aria-disabled="true"
                                >
                                    {body}
                                </div>
                            ) : (
                                <Link
                                    key={title}
                                    href={href}
                                    className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#491B3A]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    {body}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* ACCOUNT DETAILS */}
                <aside>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
                        Account
                    </h2>
                    <div className="divide-y rounded-2xl border bg-card shadow-sm">
                        <DetailRow
                            icon={<MailIcon className="size-4" />}
                            label="Email"
                            value={account?.email ?? authUser?.email ?? "—"}
                            verified={loading ? undefined : account?.emailVerified}
                        />
                        <DetailRow
                            icon={<PhoneIcon className="size-4" />}
                            label="Phone"
                            value={loading ? "—" : account?.phone ?? "No phone added"}
                            verified={loading || !account?.phone ? undefined : account.phoneVerified}
                        />
                        <DetailRow
                            icon={<ShieldCheckIcon className="size-4" />}
                            label="Status"
                            value={account?.status ? account.status.charAt(0) + account.status.slice(1).toLowerCase() : "—"}
                        />
                        <DetailRow icon={<CalendarIcon className="size-4" />} label="Member since" value={memberSince} />
                    </div>
                </aside>
            </div>
        </div>
    )
}

function DetailRow({
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
        <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-medium">{value}</p>
            </div>
            {verified === true && <BadgeCheckIcon className="size-4 shrink-0 text-emerald-600" aria-label="Verified" />}
            {verified === false && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-amber-600">
                    <CircleAlertIcon className="size-3.5" /> Unverified
                </span>
            )}
        </div>
    )
}
