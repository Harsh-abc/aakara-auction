"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import axios from "axios"

import { Skeleton } from "@/components/ui/skeleton"
import type { PublicAuction } from "@/lib/types/publicAuction.types"
import { getPublicAuction } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "@/lib/apiError"

import { AuctionCountdown } from "../AuctionCountdown"
import { auctionMeta, isLive, STOREFRONT_STATUS_LABELS } from "../auctionDisplay"
import { AuctionLots } from "./AuctionLots"

type AuctionState =
    | { status: "loading" }
    | { status: "ready"; auction: PublicAuction }
    | { status: "not-found" }
    | { status: "error"; message: string }

function Breadcrumb({ title }: { title?: string }) {
    return (
        <nav aria-label="Breadcrumb" className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            <ol className="flex flex-wrap items-center gap-2">
                <li>
                    <Link href="/" className="hover:text-neutral-900">Home</Link>
                </li>
                <li aria-hidden>›</li>
                <li>
                    <Link href="/auctions" className="hover:text-neutral-900">Auctions</Link>
                </li>
                {title && (
                    <>
                        <li aria-hidden>›</li>
                        <li className="text-neutral-900" aria-current="page">{title}</li>
                    </>
                )}
            </ol>
        </nav>
    )
}

// counts to the close while the sale is live, to the opening before that
function saleCountdown(auction: PublicAuction) {
    if (isLive(auction)) return { label: "Closes in", target: auction.endTime }
    if (auction.status === "SCHEDULED" || auction.status === "PREVIEW") return { label: "Opens in", target: auction.startTime }
    return null
}

export function AuctionDetail({ auctionUuid }: { auctionUuid: string }) {
    const [state, setState] = useState<AuctionState>({ status: "loading" })

    useEffect(() => {
        let cancelled = false
        getPublicAuction(auctionUuid)
            .then((auction) => {
                if (!cancelled) setState({ status: "ready", auction })
            })
            .catch((err) => {
                if (cancelled) return
                const status = axios.isAxiosError(err) ? err.response?.status : undefined
                // 400 = not a valid id, 404 = no such public sale
                setState(status === 404 || status === 400 ? { status: "not-found" } : { status: "error", message: getErrorMessage(err) })
            })
        return () => {
            cancelled = true
        }
    }, [auctionUuid])

    if (state.status === "loading") {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
                <Breadcrumb />
                <Skeleton className="mt-6 h-10 w-full max-w-lg rounded-none" />
                <Skeleton className="mt-4 h-4 w-full max-w-xl rounded-none" />
                <Skeleton className="mt-2 h-4 w-full max-w-md rounded-none" />
            </main>
        )
    }

    if (state.status !== "ready") {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
                <Breadcrumb />
                <div className="py-24 text-center">
                    <h1 className="text-2xl font-light text-neutral-950">
                        {state.status === "not-found" ? "Auction not found" : "Couldn't load this auction"}
                    </h1>
                    <p className="mx-auto mt-3 max-w-sm text-sm text-neutral-500">
                        {state.status === "not-found"
                            ? "This sale may have been withdrawn, or the link is incorrect."
                            : state.message}
                    </p>
                    <Link
                        href="/auctions"
                        className="mt-6 inline-flex h-10 items-center bg-neutral-950 px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800"
                    >
                        All auctions
                    </Link>
                </div>
            </main>
        )
    }

    const { auction } = state
    const countdown = saleCountdown(auction)
    const status = STOREFRONT_STATUS_LABELS[auction.status] ?? auction.status

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
            <Breadcrumb title={auction.title} />

            <header className="mt-6 max-w-2xl">
                <h1 className="text-3xl font-normal text-neutral-950 md:text-4xl">{auction.title}: Overview</h1>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                    {status} · {auctionMeta(auction)}.{auction.short_description && ` ${auction.short_description}`}
                </p>
            </header>

            <div className="mt-10">
                <AuctionLots
                    auctionUuid={auction.uuid}
                    aside={
                        countdown ? (
                            <AuctionCountdown label={countdown.label} target={countdown.target} className="shrink-0" />
                        ) : (
                            <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Sale closed</span>
                        )
                    }
                />
            </div>
        </main>
    )
}
