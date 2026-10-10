"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppSelector } from "@/hooks/redux"
import { KYC_DOCUMENTS } from "@/lib/constants/kyc"
import type { KycStatus, MyAccount, MyKyc, MyKycDocument } from "@/lib/types/profile.types"
import type { PublicAuction } from "@/lib/types/publicAuction.types"
import { cn } from "@/lib/utils"
import { getMyKyc, getMyProfile } from "@/services/operations/profile.api"
import { getPublicAuction } from "@/services/operations/publicAuction.api"
import { getErrorMessage } from "../profile/ProfileUI"

import { auctionMeta } from "./auctionDisplay"

const KYC_STATUS_LABELS: Record<KycStatus, string> = {
    NOT_SUBMITTED: "Not submitted",
    PENDING: "Under review",
    UNDER_REVIEW: "Under review",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
}

const DOCUMENT_STATUS_LABELS: Record<MyKycDocument["status"], string> = {
    PENDING: "Under review",
    APPROVED: "Verified",
    REJECTED: "Rejected",
}

const statusTone = (status: string) =>
    status === "VERIFIED" || status === "APPROVED"
        ? "bg-emerald-50 text-emerald-700"
        : status === "REJECTED"
          ? "bg-red-50 text-red-700"
          : "bg-neutral-100 text-neutral-600"

const SECTION_LABEL = "text-[10px] uppercase tracking-[0.18em] text-neutral-500"

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

    const handleOpenChange = (next: boolean) => {
        if (submitting) return
        // the box is ticked fresh every time
        if (!next) setAccepted(false)
        onOpenChange(next)
    }

    const profile = loaded?.account.profile
    const kycStatus: KycStatus = loaded?.kyc?.status ?? loaded?.account.kyc?.status ?? "NOT_SUBMITTED"
    const documents = loaded?.kyc?.documents ?? []

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
                        <Skeleton className="h-10 w-full rounded-none" />
                        <Skeleton className="h-4 w-32 rounded-none" />
                        <Skeleton className="h-16 w-full rounded-none" />
                    </div>
                ) : (
                    <div className="space-y-6 p-6">
                        {/* BIDDER */}
                        <section>
                            <p className={SECTION_LABEL}>Bidder details</p>
                            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <dt className="text-xs text-neutral-500">First name</dt>
                                    <dd className="mt-1 text-neutral-950">{profile?.firstName || "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-neutral-500">Last name</dt>
                                    <dd className="mt-1 text-neutral-950">{profile?.lastName || "—"}</dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-xs text-neutral-500">Email</dt>
                                    <dd className="mt-1 break-all text-neutral-950">{loaded.account.email}</dd>
                                </div>
                            </dl>
                            {(!profile?.firstName || !profile?.lastName) && (
                                <p className="mt-3 text-xs text-neutral-500">
                                    Your name is missing.{" "}
                                    <Link href="/my-profile" className="text-neutral-950 underline underline-offset-2">
                                        Add it in My profile
                                    </Link>
                                </p>
                            )}
                        </section>

                        {/* KYC */}
                        <section>
                            <div className="flex items-center justify-between gap-3">
                                <p className={SECTION_LABEL}>KYC documents</p>
                                <span className={cn("px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", statusTone(kycStatus))}>
                                    {KYC_STATUS_LABELS[kycStatus]}
                                </span>
                            </div>

                            {documents.length > 0 ? (
                                <ul className="mt-3 divide-y divide-neutral-200 border border-neutral-200">
                                    {documents.map((doc) => (
                                        <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                                            <span className="min-w-0 truncate text-neutral-950">
                                                {KYC_DOCUMENTS[doc.documentType]?.title ?? doc.documentType}
                                            </span>
                                            <span
                                                className={cn(
                                                    "shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                                    statusTone(doc.status)
                                                )}
                                            >
                                                {DOCUMENT_STATUS_LABELS[doc.status]}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-3 text-sm text-neutral-500">No documents uploaded yet.</p>
                            )}

                            {kycStatus !== "VERIFIED" && (
                                <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                                    Your KYC must be verified before you can register for this auction.{" "}
                                    <Link href="/my-profile" className="text-neutral-950 underline underline-offset-2">
                                        Manage KYC
                                    </Link>
                                </p>
                            )}
                        </section>

                        {/* TERMS */}
                        <section>
                            <p className={SECTION_LABEL}>Terms &amp; conditions</p>
                            <div className="mt-3 max-h-40 overflow-y-auto border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed whitespace-pre-line text-neutral-700">
                                {loaded.terms ??
                                    "By registering you agree to bid in good faith and to the auction house's standard conditions of sale, including the buyer's premium and payment terms published for this sale."}
                            </div>

                            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-neutral-800">
                                <Checkbox
                                    checked={accepted}
                                    onCheckedChange={(checked) => setAccepted(checked)}
                                    disabled={submitting}
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
                        className="inline-flex h-11 cursor-pointer items-center justify-center border border-neutral-950 bg-white px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!loaded || kycStatus !== "VERIFIED" || !accepted || submitting}
                        className="inline-flex h-11 cursor-pointer items-center justify-center bg-neutral-950 px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? "Registering..." : "Confirm registration"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
