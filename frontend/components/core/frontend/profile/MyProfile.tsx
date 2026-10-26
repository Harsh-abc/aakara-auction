"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppSelector } from "@/hooks/redux"
import { cn } from "@/lib/utils"
import { refreshSession } from "@/services/authSession"
import { getMyProfile, getMyRegistrations } from "@/services/operations/profile.api"
import type { AuctionStatus } from "@/lib/types/auction.types"
import type { MyAccount, MyAuctionRegistration } from "@/lib/types/profile.types"

import { BODY, Breadcrumb, BUTTON, BUTTON_INLINE, BUTTON_SOLID, PAGE_MAIN, PAGE_TITLE } from "../storefront"
import { BillingShippingForm } from "./BillingShippingForm"
import { ChangePasswordForm } from "./ChangePasswordForm"
import { KycDocumentsForm } from "./KycDocumentsForm"
import { MyGallery } from "./MyGallery"
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
    const searchParams = useSearchParams()
    const token = useAppSelector((state) => state.auth.accessToken)

    const urlTabParam = searchParams.get("tab")
    const urlTab: ProfileTab = isProfileTab(urlTabParam) ? urlTabParam : "personal"
    const [activeTab, setActiveTab] = useState<ProfileTab>(urlTab)

    // follow the URL when a link changes ?tab= while this page is already open
    // (e.g. "My auction gallery" in the account menu while on Personal details)
    const [seenUrlTab, setSeenUrlTab] = useState(urlTab)
    if (urlTab !== seenUrlTab) {
        setSeenUrlTab(urlTab)
        setActiveTab(urlTab)
    }

    const [account, setAccount] = useState<MyAccount | null>(null)
    const [registrations, setRegistrations] = useState<MyAuctionRegistration[]>([])
    const [loadError, setLoadError] = useState(false)

    // a rejected refresh token (expired / revoked) sends the user to /registration — see app/SessionWatcher.tsx

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
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb
                        auctions={false}
                        crumbs={[{ label: "My profile", href: "/my-profile" }, { label: tabLabels[activeTab] }]}
                    />

                    {loadError ? (
                        <div className="mt-6 border border-[#cecece] p-6">
                            <p className={BODY}>We couldn&apos;t load your profile.</p>
                            <button
                                type="button"
                                onClick={() => (token ? load(token) : refreshSession().catch(() => setLoadError(true)))}
                                className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE, "mt-4")}
                            >
                                Try again
                            </button>
                        </div>
                    ) : !account ? (
                        <ProfileSkeleton />
                    ) : (
                        <>
                            <h1 className={cn(PAGE_TITLE, "mt-6")}>Welcome, {displayName(account)}</h1>
                            <p className={cn(BODY, "mt-3 max-w-168.5")}>
                                {sales.length > 0
                                    ? `${allApproved ? "Registration complete — y" : "Y"}ou hold a paddle number for each sale below.`
                                    : "Register for an upcoming sale to receive your paddle number."}{" "}
                                Track your shortlist and bidding activity in My auction gallery.
                            </p>
                        </>
                    )}
                </div>
            </section>

            {account && sales.length > 0 && (
                <section aria-label="Your paddles">
                    <div className="page-container flex flex-col gap-4">
                        {sales.map((registration) => (
                            <RegistrationCard
                                key={registration.auction.uuid}
                                registration={registration}
                                bidderName={displayName(account)}
                                kycStatus={account.kyc?.status ?? "NOT_SUBMITTED"}
                            />
                        ))}
                    </div>
                </section>
            )}

            {account && (
                <section>
                    <div className="page-container">
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => handleTabChange(value as ProfileTab)}
                            className="gap-0 md:mt-4"
                        >
                            {/* overrides restyle shadcn's default pill tabs into the flat underline design */}
                            {/* phones & tablets: a 2-up grid of boxed buttons (active one solid black; an odd last one spans the row).
                                laptop+: the underline tabs on a hairline */}
                            <TabsList className="mb-0 grid w-full grid-cols-2 gap-2 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto lg:-mb-px lg:flex lg:justify-start lg:gap-0 lg:overflow-x-auto lg:border-b lg:border-[#cecece] lg:scrollbar-none">
                                {(Object.keys(tabLabels) as ProfileTab[]).map((tab) => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="h-auto min-h-11 min-w-0 cursor-pointer justify-center rounded-none border border-[#cecece] bg-white px-3 py-2 text-center text-[11px] leading-4 font-normal tracking-[0.14em] whitespace-normal text-[#717171] uppercase transition-colors duration-200 last:odd:col-span-2 after:hidden hover:border-[#0d0d0d] hover:text-[#0d0d0d] data-active:border-[#0d0d0d] data-active:bg-[#0d0d0d] data-active:font-medium data-active:text-white group-data-[variant=default]/tabs-list:data-active:shadow-none lg:-mb-px lg:h-10.25 lg:min-h-0 lg:flex-none lg:border-0 lg:border-b-2 lg:border-transparent lg:bg-transparent lg:px-5 lg:py-0 lg:text-[12px] lg:leading-4.5 lg:whitespace-nowrap lg:after:block lg:hover:bg-[#fdf1e3]/60 lg:data-active:border-[#cea25a] lg:data-active:bg-[#fdf1e3] lg:data-active:text-[#0d0d0d]"
                                    >
                                        {tabLabels[tab]}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* keepMounted so switching tabs doesn't wipe what the user typed */}
                            <TabsContent value="personal" keepMounted className="flex flex-col gap-12 pt-8">
                                <PersonalDetailsForm account={account} onSaved={setAccount} />
                                <ChangePasswordForm />
                            </TabsContent>

                            <TabsContent value="billing" keepMounted className="pt-8">
                                <BillingShippingForm account={account} onSaved={setAccount} />
                            </TabsContent>

                            <TabsContent value="kyc" keepMounted className="pt-8">
                                <KycDocumentsForm
                                    onKycChange={({ kycType, status, verifiedAt, rejectionReason }) =>
                                        setAccount((prev) =>
                                            prev && { ...prev, kyc: { kycType, status, verifiedAt, rejectionReason } }
                                        )
                                    }
                                />
                            </TabsContent>

                            <TabsContent value="orders" className="pt-8">
                                <ProfileSection title="My orders">
                                    <EmptyState
                                        title="No orders yet"
                                        body="Lots you win will appear here with their invoice, payment and shipping status."
                                    />
                                </ProfileSection>
                            </TabsContent>

                            <TabsContent value="gallery" className="pt-8">
                                <ProfileSection
                                    title="My auction gallery"
                                    description="Lots you saved with “Add to my auction gallery”. Click “In my auction gallery” on a lot to remove it."
                                >
                                    <MyGallery
                                        empty={
                                            <EmptyState
                                                title="No saved lots yet"
                                                body="Tap “+ Add to my auction gallery” on any artwork while browsing and it will be collected here."
                                            />
                                        }
                                    />
                                </ProfileSection>
                            </TabsContent>
                        </Tabs>
                    </div>
                </section>
            )}
        </main>
    )
}

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="border border-[#cecece] px-6 py-8 text-center">
            <p className="text-[14px] leading-5 font-medium text-[#0d0d0d]">{title}</p>
            <p className="mx-auto mt-2 max-w-lg text-[12px] leading-[19.5px] text-[#717171]">{body}</p>
            <Link href="/" className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE, "mt-4")}>
                Browse lots
            </Link>
        </div>
    )
}

function ProfileSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading your profile" className="mt-6 animate-pulse">
            <div className="h-12 w-2/3 max-w-md bg-[#f4f2ef]" />
            <div className="mt-4 h-4 w-full max-w-xl bg-[#f4f2ef]" />
            <div className="mt-12 h-28 border border-[#cecece]" />
            <div className="mt-12 h-10.25 border-b border-[#cecece]" />
            <div className="mt-8 h-80 bg-[#f4f2ef]" />
        </div>
    )
}
