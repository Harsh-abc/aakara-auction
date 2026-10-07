"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronRight } from "lucide-react"
import toast from "react-hot-toast"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppSelector } from "@/hooks/redux"
import { refreshSession, SESSION_EXPIRED_EVENT } from "@/services/authSession"
import { getMyProfile, getMyRegistrations } from "@/services/operations/profile.api"
import type { AuctionStatus } from "@/lib/types/auction.types"
import type { MyAccount, MyAuctionRegistration } from "@/lib/types/profile.types"

import { BillingShippingForm } from "./BillingShippingForm"
import { ChangePasswordForm } from "./ChangePasswordForm"
import { KycDocumentsForm } from "./KycDocumentsForm"
import { PersonalDetailsForm } from "./PersonalDetailsForm"
import { ProfileSection } from "./ProfileUI"
import { RegistrationCard } from "./RegistrationCard"

type ProfileTab = "personal" | "billing" | "kyc" | "orders" | "gallery"

const tabLabels: Record<ProfileTab, string> = {
    personal: "Personal details",
    billing: "Billing & shipping",
    kyc: "KYC documents",
    orders: "My orders",
    gallery: "My auction gallery",
}

const isProfileTab = (value: string | null): value is ProfileTab => !!value && value in tabLabels

const LOGIN_HREF = `/registration?redirect=${encodeURIComponent("/my-profile")}`

// sales worth showing a paddle card for: not finished, and the registration still stands
const UPCOMING_STATUSES: AuctionStatus[] = ["LIVE", "PAUSED", "PREVIEW", "SCHEDULED"]
const IN_PROGRESS_STATUSES: AuctionStatus[] = ["LIVE", "PAUSED"]

function activeRegistrations(registrations: MyAuctionRegistration[]) {
    return registrations
        .filter(
            (r) =>
                UPCOMING_STATUSES.includes(r.auction.status) && (r.status === "APPROVED" || r.status === "PENDING")
        )
        // in-progress sales first; the API already sorts by start time
        .sort(
            (a, b) =>
                Number(IN_PROGRESS_STATUSES.includes(b.auction.status)) -
                Number(IN_PROGRESS_STATUSES.includes(a.auction.status))
        )
}

function displayName(account: MyAccount) {
    const fullName = [account.profile?.firstName, account.profile?.lastName].filter(Boolean).join(" ")
    return account.profile?.displayName || fullName || account.username
}

export function MyProfile() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = useAppSelector((state) => state.auth.accessToken)

    const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
        const tab = searchParams.get("tab")
        return isProfileTab(tab) ? tab : "personal"
    })

    const [account, setAccount] = useState<MyAccount | null>(null)
    const [registrations, setRegistrations] = useState<MyAuctionRegistration[]>([])
    const [loadError, setLoadError] = useState(false)

    // refresh token rejected (expired / revoked) → back to log in
    useEffect(() => {
        const onSessionExpired = () => {
            toast.error("Session expired. Please log in again.")
            router.replace(LOGIN_HREF)
        }
        window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    }, [router])

    // the refresh cookie got us past the proxy, but the store has no access token
    // (e.g. site storage was cleared) — get one; a rejected cookie fires SESSION_EXPIRED_EVENT
    useEffect(() => {
        if (token) return
        refreshSession().catch(() => setLoadError(true))
    }, [token])

    const load = useCallback(async (accessToken: string) => {
        setLoadError(false)
        try {
            const [me, myRegistrations] = await Promise.all([
                getMyProfile(accessToken),
                // the paddle cards are secondary — don't fail the whole page over them
                getMyRegistrations(accessToken).catch(() => []),
            ])
            setAccount(me)
            setRegistrations(myRegistrations)
        } catch {
            setLoadError(true)
        }
    }, [])

    // load once; later token refreshes must not reload the page and wipe unsaved edits
    const loadedRef = useRef(false)
    useEffect(() => {
        if (!token || loadedRef.current) return
        loadedRef.current = true
        load(token)
    }, [token, load])

    const handleTabChange = (value: ProfileTab) => {
        setActiveTab(value)

        // keep the tab in the URL without a server round-trip, so it survives refresh and can be linked to
        const params = new URLSearchParams(searchParams.toString())
        if (value === "personal") params.delete("tab")
        else params.set("tab", value)

        const query = params.toString()
        window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname)
    }

    const sales = activeRegistrations(registrations)
    const allApproved = sales.length > 0 && sales.every((r) => r.status === "APPROVED")

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-12 md:py-12">
            <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.18em]">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="text-neutral-500 hover:text-neutral-900">
                            Home
                        </Link>
                    </li>
                    <li aria-hidden className="text-neutral-400">
                        <ChevronRight className="h-3 w-3" />
                    </li>
                    <li>
                        <Link href="/my-profile" className="text-neutral-500 hover:text-neutral-900">
                            My profile
                        </Link>
                    </li>
                    <li aria-hidden className="text-neutral-400">
                        <ChevronRight className="h-3 w-3" />
                    </li>
                    <li aria-current="page" className="text-neutral-900">
                        {tabLabels[activeTab]}
                    </li>
                </ol>
            </nav>

            {loadError ? (
                <div className="mt-10 border border-neutral-200 p-6 text-sm text-neutral-600">
                    <p>We couldn&apos;t load your profile.</p>
                    <button
                        type="button"
                        onClick={() => (token ? load(token) : refreshSession().catch(() => setLoadError(true)))}
                        className="mt-4 h-10 cursor-pointer bg-neutral-950 px-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white hover:bg-neutral-800"
                    >
                        Try again
                    </button>
                </div>
            ) : !account ? (
                <ProfileSkeleton />
            ) : (
                <>
                    <header className="mt-6">
                        <h1 className="text-4xl font-normal tracking-tight text-neutral-950 md:text-5xl">
                            Welcome, {displayName(account)}
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-500">
                            {sales.length > 0
                                ? `${allApproved ? "Registration complete — y" : "Y"}ou hold a paddle number for each sale below.`
                                : "Register for an upcoming sale to receive your paddle number."}{" "}
                            Track your shortlist and bidding activity in My auction gallery.
                        </p>
                    </header>

                    {sales.length > 0 && (
                        <div className="mt-8 flex flex-col gap-4 md:mt-10">
                            {sales.map((registration) => (
                                <RegistrationCard
                                    key={registration.auction.uuid}
                                    registration={registration}
                                    bidderName={displayName(account)}
                                    kycStatus={account.kyc?.status ?? "NOT_SUBMITTED"}
                                />
                            ))}
                        </div>
                    )}

                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => handleTabChange(value as ProfileTab)}
                        className="mt-10 gap-0 md:mt-12"
                    >
                        {/* overrides restyle shadcn's default pill tabs into the flat boxed design */}
                        <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b border-neutral-300 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                            {(Object.keys(tabLabels) as ProfileTab[]).map((tab) => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="h-auto flex-none cursor-pointer rounded-none border border-transparent px-4 py-3 text-[11px] font-normal uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900 data-active:border-neutral-900 data-active:bg-white data-active:text-neutral-900 group-data-[variant=default]/tabs-list:data-active:shadow-none"
                                >
                                    {tabLabels[tab]}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* keepMounted so switching tabs doesn't wipe what the user typed */}
                        <TabsContent value="personal" keepMounted className="flex flex-col gap-6 pt-6 md:pt-8">
                            <PersonalDetailsForm account={account} onSaved={setAccount} />
                            <ChangePasswordForm />
                        </TabsContent>

                        <TabsContent value="billing" keepMounted className="pt-6 md:pt-8">
                            <BillingShippingForm account={account} onSaved={setAccount} />
                        </TabsContent>

                        <TabsContent value="kyc" keepMounted className="pt-6 md:pt-8">
                            <KycDocumentsForm
                                onKycChange={({ kycType, status, verifiedAt, rejectionReason }) =>
                                    setAccount((prev) =>
                                        prev && { ...prev, kyc: { kycType, status, verifiedAt, rejectionReason } }
                                    )
                                }
                            />
                        </TabsContent>

                        <TabsContent value="orders" className="pt-6 md:pt-8">
                            <ProfileSection title="My orders">
                                <EmptyState
                                    title="No orders yet"
                                    body="Lots you win will appear here with their invoice, payment and shipping status."
                                />
                            </ProfileSection>
                        </TabsContent>

                        <TabsContent value="gallery" className="pt-6 md:pt-8">
                            <ProfileSection title="My auction gallery">
                                <EmptyState
                                    title="Nothing shortlisted yet"
                                    body="Lots you shortlist and bid on will appear here, so you can follow them through the sale."
                                />
                            </ProfileSection>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </main>
    )
}

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="py-6 text-center">
            <p className="text-sm text-neutral-900">{title}</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-neutral-500">{body}</p>
            <Link
                href="/"
                className="mt-5 inline-flex h-10 items-center bg-neutral-950 px-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800"
            >
                Browse auctions
            </Link>
        </div>
    )
}

function ProfileSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading your profile" className="mt-6 animate-pulse">
            <div className="h-12 w-2/3 max-w-md bg-neutral-100" />
            <div className="mt-4 h-4 w-full max-w-xl bg-neutral-100" />
            <div className="mt-10 h-28 border border-neutral-200" />
            <div className="mt-12 h-11 border-b border-neutral-200" />
            <div className="mt-8 h-80 border border-neutral-200" />
        </div>
    )
}
