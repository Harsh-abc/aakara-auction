"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, BUTTON_SOLID, EYEBROW, PAGE_MAIN } from "./storefront"

// seconds before a lost visitor is taken to the home page
const REDIRECT_SECONDS = 10

const HOME = "/"

/**
 * The 404 page body: says the page doesn't exist and counts down to the home page.
 * "Go back" returns to the previous page when it was on this site, otherwise goes home;
 * "Stay on this page" stops the countdown.
 */
export function NotFoundView() {
    const router = useRouter()
    const [seconds, setSeconds] = useState(REDIRECT_SECONDS)
    const [stayed, setStayed] = useState(false)

    useEffect(() => {
        if (stayed) return
        if (seconds <= 0) {
            router.replace(HOME)
            return
        }
        const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
        return () => window.clearTimeout(id)
    }, [seconds, stayed, router])

    // back only within the site — a visitor who arrived from a search result or another site goes home instead
    const goBack = () => {
        const cameFromHere = document.referrer.startsWith(window.location.origin)
        if (cameFromHere && window.history.length > 1) router.back()
        else router.replace(HOME)
    }

    return (
        <main className={PAGE_MAIN}>
            <section aria-labelledby="not-found-heading">
                <div className="page-container">
                    <div className="mx-auto flex max-w-xl flex-col items-center py-10 text-center md:py-16">
                        <p className={EYEBROW}>Error 404</p>
                        <p aria-hidden className="mt-6 text-[96px] leading-none font-medium tracking-[-0.04em] text-[#0d0d0d] sm:text-[144px]">
                            404
                        </p>
                        <h1 id="not-found-heading" className="mt-8 text-[28px] leading-9 font-medium tracking-tight text-[#0d0d0d] sm:text-[32px]">
                            Page not found
                        </h1>
                        <p className={cn(BODY, "mt-3 max-w-md")}>
                            The page you&apos;re looking for doesn&apos;t exist, or it may have moved. Check the address, or carry on from the home page.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link href={HOME} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE)}>
                                Go to home page
                            </Link>
                            <button type="button" onClick={goBack} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE)}>
                                Go back
                            </button>
                        </div>

                        {/* countdown to the home page, with a gold hairline running down */}
                        <div className="mt-12 w-full max-w-xs">
                            <p className={EYEBROW}>{stayed ? "Redirect cancelled" : `Taking you home in ${seconds}s`}</p>
                            <div aria-hidden className="mt-3 h-px w-full bg-[#cecece]">
                                <div
                                    className="h-full bg-[#d0a55d] transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                                    style={{ width: stayed ? "0%" : `${(seconds / REDIRECT_SECONDS) * 100}%` }}
                                />
                            </div>
                            {!stayed && (
                                <button
                                    type="button"
                                    onClick={() => setStayed(true)}
                                    className="mt-3 cursor-pointer text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase underline underline-offset-2 hover:text-[#0d0d0d]"
                                >
                                    Stay on this page
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
