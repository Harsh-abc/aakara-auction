"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-12 md:py-12">
            <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.18em]">
                <ol className="flex items-center gap-2">
                    <li>
                        <Link href="/" className="text-neutral-500 hover:text-neutral-900">
                            Home
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

            <header className="mt-6">
                <h1 className="text-4xl font-normal tracking-tight text-neutral-950 md:text-5xl">
                    Log in / Sign up
                </h1>
                <p className="mt-4 text-sm text-neutral-500">
                    Log in or create an account to continue to auction registration.
                </p>
            </header>

            <div className="mt-10 grid grid-cols-1 gap-12 md:mt-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
                <div className="order-2 lg:order-1">
                    <RegistrationBenefits />
                </div>

                <div className="order-1 lg:order-2">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => handleTabChange(value as AuthTab)}
                        className="gap-0 border border-neutral-500 bg-white p-5 md:p-6"
                    >
                        {/* overrides restyle shadcn's default pill tabs into the flat underline design */}
                        <TabsList className="w-full justify-start rounded-none border-b border-neutral-200 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                            {(Object.keys(tabLabels) as AuthTab[]).map((tab) => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="-mb-px h-auto flex-none cursor-pointer rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-normal uppercase tracking-[0.18em] text-neutral-900 hover:bg-[#FBEEDC]/60 hover:text-neutral-900 data-active:border-[#C9A36A] data-active:bg-[#FBEEDC] group-data-[variant=default]/tabs-list:data-active:shadow-none"
                                >
                                    {tabLabels[tab]}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* keepMounted so switching tabs doesn't wipe what the user typed */}
                        <TabsContent value="login" keepMounted className="pt-7">
                            <RegistrationLoginForm
                                key={newAccount?.version ?? 0}
                                redirectTo={redirectTo}
                                newAccountEmail={newAccount?.email}
                            />
                        </TabsContent>

                        <TabsContent value="signup" keepMounted className="pt-7">
                            <RegistrationSignupForm onAccountCreated={handleAccountCreated} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </main>
    )
}
