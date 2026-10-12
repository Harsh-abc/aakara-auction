"use client"

import { Suspense } from "react"

import { LiveStudio } from "@/components/core/Dashboard/live/LiveStudio"

export default function GoLivePage() {
    return (
        <div className="w-full">
            {/* the studio reads ?auction= */}
            <Suspense>
                <LiveStudio />
            </Suspense>
        </div>
    )
}
