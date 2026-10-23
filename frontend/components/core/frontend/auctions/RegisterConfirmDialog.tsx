"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppSelector } from "@/hooks/redux"
import { KYC_DOCUMENTS } from "@/lib/constants/kyc"
import { TERMS_OF_SALE } from "@/lib/constants/termsOfSale"
import type { KycStatus, MyAccount, MyKyc } from "@/lib/types/profile.types"
import type { PublicAuction } from "@/lib/types/publicAuction.types"
import { cn } from "@/lib/utils"
import { getMyKyc, getMyProfile } from "@/services/operations/profile.api"
import { getPublicAuction } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "@/lib/apiError"
import { accountName } from "@/lib/accountName"

import { auctionMeta } from "./auctionDisplay"
import { TermsOfSaleDocument } from "./TermsOfSaleDocument"

const KYC_STATUS_LABELS: Record<KycStatus, string> = {
    NOT_SUBMITTED: "Not submitted",
    PENDING: "Under review",
    UNDER_REVIEW: "Under review",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
}

const statusTone = (status: string) =>
    status === "VERIFIED"
        ? "bg-emerald-50 text-emerald-700"
        : status === "REJECTED"
          ? "bg-red-50 text-red-700"
          : "bg-neutral-100 text-neutral-600"

const SECTION_LABEL = "text-[10px] uppercase tracking-[0.18em] text-neutral-500"
const FIELD_LABEL = "text-[10px] uppercase tracking-[0.12em] text-neutral-500"

/** px from the bottom that still counts as having scrolled to the end (sub-pixel rounding, zoom) */
const SCROLL_END_TOLERANCE = 16

type Details = {
    account: MyAccount
    kyc: MyKyc | null
    terms: string | null
}

type RegisterConfirmDialogProps = {
    auction: PublicAuction
    open: boolean
    onOpenChange: (open: boolean) => void
    submitting: boolean
    onConfirm: () => void
}

export function RegisterConfirmDialog({ auction, open, onOpenChange, submitting, onConfirm }: RegisterConfirmDialogProps) {
    const token = useAppSelector((state) => state.auth.accessToken)

    // tagged with the auction they were loaded for, so reopening on another sale never shows stale details
    const [details, setDetails] = useState<(Details & { key: string }) | null>(null)
    const [error, setError] = useState<{ key: string; message: string } | null>(null)
    const [accepted, setAccepted] = useState(false)
    const [readToEnd, setReadToEnd] = useState(false)
    const termsRef = useRef<HTMLDivElement>(null)

    const loaded = details?.key === auction.uuid ? details : null
    const loadError = error?.key === auction.uuid ? error.message : null

    useEffect(() => {
        if (!open) return
        let cancelled = false

        Promise.all([getMyProfile(token), getMyKyc(token), getPublicAuction(auction.uuid)])
            .then(([account, kyc, fullAuction]) => {
                if (cancelled) return
                setDetails({ key: auction.uuid, account, kyc, terms: fullAuction.termsAndConditions?.trim() || null })
                setError(null)
            })
            .catch((err) => {
                if (!cancelled) setError({ key: auction.uuid, message: getErrorMessage(err) })
            })

        return () => {
            cancelled = true
        }
    }, [open, token, auction.uuid])

    // the checkbox unlocks once the bidder has scrolled to the bottom of the terms
    const markReadIfAtEnd = (el: HTMLElement) => {
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_END_TOLERANCE) setReadToEnd(true)
    }

    // terms short enough to fit without scrolling count as read
    useEffect(() => {
        if (open && loaded && termsRef.current) markReadIfAtEnd(termsRef.current)
    }, [open, loaded])

    const handleOpenChange = (next: boolean) => {
        if (submitting) return
        // the terms are read and ticked fresh every time
        if (!next) {
            setAccepted(false)
            setReadToEnd(false)
        }
        onOpenChange(next)
    }

    const name = loaded ? accountName(loaded.account) : null
    const kycStatus: KycStatus = loaded?.kyc?.status ?? loaded?.account.kyc?.status ?? "NOT_SUBMITTED"
    const fullName = [name?.firstName, name?.lastName].filter(Boolean).join(" ")
    const documentNames = (loaded?.kyc?.documents ?? [])
        .map((doc) => KYC_DOCUMENTS[doc.documentType]?.title ?? doc.documentType)
        .join(", ")

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-none p-0 sm:max-w-lg">
                <DialogHeader className="border-b border-neutral-200 p-6 pr-12">
                    <p className={SECTION_LABEL}>Register to bid</p>
                    <DialogTitle className="text-xl font-light leading-snug text-neutral-950">{auction.title}</DialogTitle>
                    <DialogDescription className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        {auctionMeta(auction)}
                    </DialogDescription>
                </DialogHeader>

                {!loaded && loadError ? (
                    <p className="p-6 text-sm text-red-600">{loadError}</p>
                ) : !loaded ? (
                    <div className="space-y-4 p-6">
                        <Skeleton className="h-4 w-32 rounded-none" />
                        <Skeleton className="h-14 w-full rounded-none" />
                        <Skeleton className="h-4 w-32 rounded-none" />
                        <Skeleton className="h-40 w-full rounded-none" />
                    </div>
                ) : (
                    <div className="space-y-6 p-6">
                        {/* BIDDER + KYC, one compact strip */}
                        <section>
                            <p className={SECTION_LABEL}>Bidder details</p>
                            <dl className="mt-3 grid grid-cols-1 divide-y divide-neutral-200 border border-neutral-200 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:divide-x sm:divide-y-0">
                                <div className="min-w-0 px-3 py-2.5">
                                    <dt className={FIELD_LABEL}>Name</dt>
                                    <dd className="mt-1 truncate text-neutral-950" title={fullName || undefined}>
                                        {fullName || "—"}
                                    </dd>
                                </div>
                                <div className="min-w-0 px-3 py-2.5">
                                    <dt className={FIELD_LABEL}>Email</dt>
                                    <dd className="mt-1 truncate text-neutral-950" title={loaded.account.email}>
                                        {loaded.account.email}
                                    </dd>
                                </div>
                                <div className="min-w-0 px-3 py-2.5">
                                    <dt className={FIELD_LABEL}>KYC</dt>
                                    <dd className="mt-1 flex items-center gap-2">
                                        <span
                                            className={cn(
                                                "shrink-0 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                                statusTone(kycStatus)
                                            )}
                                        >
                                            {KYC_STATUS_LABELS[kycStatus]}
                                        </span>
                                        {documentNames && (
                                            <span className="truncate text-xs text-neutral-500" title={documentNames}>
                                                {documentNames}
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            </dl>

                            {(!name?.firstName || !name?.lastName) && (
                                <p className="mt-2 text-xs text-neutral-500">
                                    Your name is missing.{" "}
                                    <Link href="/my-profile" className="text-neutral-950 underline underline-offset-2">
                                        Add it in My profile
                                    </Link>
                                </p>
                            )}
                            {kycStatus !== "VERIFIED" && (
                                <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                                    Your KYC must be verified before you can register for this auction.{" "}
                                    <Link href="/my-profile" className="text-neutral-950 underline underline-offset-2">
                                        Manage KYC
                                    </Link>
                                </p>
                            )}
                        </section>

                        {/* TERMS */}
                        <section>
                            <div className="flex items-center justify-between gap-3">
                                <p className={SECTION_LABEL}>Terms &amp; conditions</p>
                                <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                                    Version {TERMS_OF_SALE.version}
                                </span>
                            </div>
                            <div
                                ref={termsRef}
                                onScroll={(e) => markReadIfAtEnd(e.currentTarget)}
                                tabIndex={0}
                                aria-label="Terms and conditions of sale"
                                className="mt-3 max-h-72 overflow-y-auto border border-neutral-200 bg-neutral-50 p-4 focus-visible:outline-1 focus-visible:outline-neutral-950"
                            >
                                <TermsOfSaleDocument auctionTerms={loaded.terms} />
                            </div>
                            <p className="mt-2 text-xs text-neutral-500" aria-live="polite">
                                {readToEnd
                                    ? "You've reached the end of the terms."
                                    : "Scroll to the end of the terms to enable the checkbox."}
                            </p>

                            <label
                                className={cn(
                                    "mt-4 flex items-start gap-3 text-sm text-neutral-800",
                                    readToEnd ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                                )}
                            >
                                <Checkbox
                                    checked={accepted}
                                    onCheckedChange={(checked) => setAccepted(checked)}
                                    disabled={submitting || !readToEnd}
                                    className="mt-0.5 rounded-none"
                                />
                                <span>I have read and agree to the terms and conditions of this auction.</span>
                            </label>
                        </section>
                    </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 p-6 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        disabled={submitting}
                        className="inline-flex h-11 cursor-pointer items-center justify-center border border-neutral-950 bg-white px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition-colors not-disabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!loaded || kycStatus !== "VERIFIED" || !accepted || submitting}
                        className="inline-flex h-11 cursor-pointer items-center justify-center bg-neutral-950 px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors not-disabled:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? "Registering..." : "Confirm registration"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
