"use client"

import { WebsiteSettings } from "@/components/core/Dashboard/settings/WebsiteSettings"

export default function WebsiteSettingsPage() {
    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
            <header className="mb-8">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b08d57]">Settings</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Website</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Choose what the public website shows. Start with the homepage hero images visitors see when no
                    auction is live or scheduled.
                </p>
            </header>
            <WebsiteSettings />
        </div>
    )
}
