"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BODY, Breadcrumb, PAGE_MAIN, PAGE_TITLE } from "@/components/core/frontend/storefront"
import { cn } from "@/lib/utils"

import { RegistrationBenefits } from "./RegistrationBenefits"
import { RegistrationLoginForm } from "./RegistrationLoginForm"
import { RegistrationSignupForm } from "./RegistrationSignupForm"

type AuthTab = "login" | "signup"

const tabLabels: Record<AuthTab, string> = {
    login: "Log in",
    signup: "Sign up",
}

// only allow same-origin relative paths so ?redirect= can't send users off-site
function getSafeRedirect(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return null
    return value
}

export function Registration() {
    const searchParams = useSearchParams()

    const [activeTab, setActiveTab] = useState<AuthTab>(
        searchParams.get("tab") === "signup" ? "signup" : "login"
    )

    const redirectTo = getSafeRedirect(searchParams.get("redirect"))

    // email of an account just created in the Sign up tab; `version` remounts the login form so it picks the email up
    const [newAccount, setNewAccount] = useState<{ email: string; version: number } | null>(null)

    const handleAccountCreated = (email: string) => {
        setNewAccount((prev) => ({ email, version: (prev?.version ?? 0) + 1 }))
        handleTabChange("login")
    }

    const handleTabChange = (value: AuthTab) => {
        setActiveTab(value)

        // keep the tab in the URL without a server round-trip, so it survives refresh and can be linked to
        const params = new URLSearchParams(searchParams.toString())
        if (value === "signup") params.set("tab", "signup")
        else params.delete("tab")

        const query = params.toString()
        window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname)
    }

    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb auctions={false} crumbs={[{ label: tabLabels[activeTab] }]} />
                    <h1 className={cn(PAGE_TITLE, "mt-6")}>Log in / Sign up</h1>
                    <p className={cn(BODY, "mt-3")}>Log in or create an account to continue to auction registration.</p>
                </div>
            </section>

            <section>
                {/* benefits | 420px log in / sign up box */}
                <div className="page-container grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10">
                    <div className="order-2 lg:order-1">
                        <RegistrationBenefits />
                    </div>

                    <div className="order-1 lg:order-2">
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => handleTabChange(value as AuthTab)}
                            className="gap-0 border border-[#333] bg-white p-5 sm:p-6.5"
                        >
                            {/* overrides restyle shadcn's default pill tabs into the flat underline design */}
                            <TabsList className="w-full justify-start rounded-none border-b border-[#cecece] bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                                {(Object.keys(tabLabels) as AuthTab[]).map((tab) => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="-mb-px h-8.75 flex-none cursor-pointer rounded-none border-0 border-b-2 border-transparent px-4 text-[12px] leading-4.5 font-normal tracking-[0.14em] text-[#717171] uppercase hover:bg-[#fdf1e3]/60 hover:text-[#0d0d0d] data-active:border-[#cea25a] data-active:bg-[#fdf1e3] data-active:font-medium data-active:text-[#0d0d0d] group-data-[variant=default]/tabs-list:data-active:shadow-none"
                                    >
                                        {tabLabels[tab]}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* keepMounted so switching tabs doesn't wipe what the user typed */}
                            <TabsContent value="login" keepMounted className="pt-6">
                                <RegistrationLoginForm
                                    key={newAccount?.version ?? 0}
                                    redirectTo={redirectTo}
                                    newAccountEmail={newAccount?.email}
                                />
                            </TabsContent>

                            <TabsContent value="signup" keepMounted className="pt-6">
                                <RegistrationSignupForm onAccountCreated={handleAccountCreated} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </section>
        </main>
    )
}
