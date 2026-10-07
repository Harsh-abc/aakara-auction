"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import toast from "react-hot-toast"
import { Check, CheckCheck, FileText, Maximize, ShieldCheck, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AppDispatch, RootState } from "@/redux/store"
import { reviewUserKyc } from "@/services/operations/user.api"
import { KYC_DOCUMENT_GROUPS, KYC_DOCUMENTS } from "@/lib/constants/kyc"
import type { KycDocumentReview, KycDocumentStatus, User, UserKycDocument } from "@/lib/types/user.types"
import { KycRequestDialog, KycRequestNotice, useCanRequestKycDocuments } from "./KycRequestDialog"

// must match the roles on PATCH /users/:uuid/kyc/review
const KYC_REVIEW_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF"]

const KYC_STATUS_BADGE: Record<string, { label: string; className: string }> = {
    NOT_SUBMITTED: { label: "Not submitted", className: "bg-[#eeeeee] text-[#555]" },
    PENDING: { label: "Pending review", className: "bg-[#fff4e8] text-[#f28c28]" },
    UNDER_REVIEW: { label: "Under review", className: "bg-[#fff4e8] text-[#f28c28]" },
    VERIFIED: { label: "Verified", className: "bg-[#effbf3] text-[#16a34a]" },
    REJECTED: { label: "Rejected", className: "bg-[#fff0f0] text-red-500" },
}

const DOCUMENT_STATUS_BADGE: Record<KycDocumentStatus, { label: string; className: string }> = {
    PENDING: { label: "Pending for review", className: "bg-[#fff4e8] text-[#f28c28]" },
    APPROVED: { label: "Approved", className: "bg-[#effbf3] text-[#16a34a]" },
    REJECTED: { label: "Rejected", className: "bg-[#fff0f0] text-red-500" },
}

// pending first (what the reviewer has to act on), then in the order the enum lists them
const TYPE_ORDER = Object.keys(KYC_DOCUMENTS)
const sortDocuments = (docs: UserKycDocument[]) =>
    [...docs].sort(
        (a, b) =>
            Number(b.status === "PENDING") - Number(a.status === "PENDING") ||
            TYPE_ORDER.indexOf(a.documentType) - TYPE_ORDER.indexOf(b.documentType)
    )

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

const formatSize = (bytes: string) => {
    const n = Number(bytes)
    return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}

export function KycReview({ user }: { user: User }) {
    const dispatch = useDispatch<AppDispatch>()
    const role = useSelector((state: RootState) => state.auth.role)
    const reviewingIds = useSelector((state: RootState) => state.user.reviewingDocumentIds)
    const canRequest = useCanRequestKycDocuments()

    // document being rejected, and the reason typed for it
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [reason, setReason] = useState("")

    const kyc = user.kyc
    if (!kyc) return null

    const canReview = !!role && KYC_REVIEW_ROLES.includes(role)
    const busy = reviewingIds.length > 0
    const documents = sortDocuments(kyc.documents ?? [])
    const pending = documents.filter((doc) => doc.status === "PENDING")
    const statusBadge = KYC_STATUS_BADGE[kyc.status] ?? KYC_STATUS_BADGE.PENDING

    const requirements = KYC_DOCUMENT_GROUPS.filter((group) => group.requiredFor.includes(kyc.kycType)).map(
        (group) => {
            const docs = documents.filter((doc) => group.types.includes(doc.documentType))
            const state = docs.some((d) => d.status === "APPROVED")
                ? "approved"
                : docs.some((d) => d.status === "PENDING")
                    ? "pending"
                    : "missing"
            return { id: group.id, title: group.title, state }
        }
    )

    const submit = async (reviews: KycDocumentReview[]) => {
        try {
            const response = await dispatch(reviewUserKyc({ uuid: user.uuid, reviews })).unwrap()
            setRejectingId(null)
            setReason("")

            const { kycStatus } = response.data
            if (kycStatus === "VERIFIED") toast.success("KYC verified. The user can now be approved to bid.")
            else if (kycStatus === "REJECTED") toast.success("Review saved. The user has been asked to resubmit.")
            else toast.success("Review saved")
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not save the review")
        }
    }

    const startReject = (id: string) => {
        setRejectingId(id)
        setReason("")
    }

    return (
        <section className="mt-6 rounded-[12px] bg-dashboardFormBg p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[20px] font-bold text-[#0F172A]">KYC Documents</h2>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-medium ${statusBadge.className}`}>
                            {statusBadge.label}
                        </span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#777]">
                        {kyc.kycType === "BUSINESS" ? "Business" : "Individual"}
                        {kyc.submittedAt && ` · submitted ${formatDate(kyc.submittedAt)}`}
                        {kyc.status === "VERIFIED" && kyc.verifiedAt && ` · verified ${formatDate(kyc.verifiedAt)}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {canRequest && <KycRequestDialog user={user} />}

                    {canReview && pending.length > 1 && (
                        <Button
                            type="button"
                            disabled={busy}
                            onClick={() => submit(pending.map((doc) => ({ documentId: doc.id, action: "APPROVE" })))}
                            className="h-9 rounded-[6px] bg-[#16A34A] px-4 text-[11px] font-medium text-white hover:bg-[#15803D]"
                        >
                            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                            Approve all {pending.length} pending
                        </Button>
                    )}
                </div>
            </div>

            <KycRequestNotice user={user} />

            {/* what has to be approved before the KYC can be verified */}
            {requirements.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-[#555]">Required:</span>
                    {requirements.map((req) => (
                        <span
                            key={req.id}
                            className={`rounded-full px-3 py-1 font-medium ${req.state === "approved"
                                ? "bg-[#effbf3] text-[#16a34a]"
                                : req.state === "pending"
                                    ? "bg-[#fff4e8] text-[#f28c28]"
                                    : "bg-[#fff0f0] text-red-500"
                                }`}
                        >
                            {req.title} · {req.state === "approved" ? "approved" : req.state === "pending" ? "awaiting review" : "missing"}
                        </span>
                    ))}
                    <span className="text-[#777]">Other documents are optional.</span>
                </div>
            )}

            {kyc.status === "REJECTED" && kyc.rejectionReason && (
                <p className="mb-4 rounded-[8px] bg-[#fff0f0] px-4 py-3 text-[12px] text-red-600">
                    Sent back to the user: {kyc.rejectionReason}
                </p>
            )}

            {kyc.status === "VERIFIED" && (
                <p className="mb-4 flex items-center gap-2 rounded-[8px] bg-[#effbf3] px-4 py-3 text-[12px] text-[#15803D]">
                    <ShieldCheck className="h-4 w-4" />
                    All required documents are approved. This user&apos;s KYC is verified.
                </p>
            )}

            {documents.length === 0 ? (
                <p className="rounded-[10px] border border-dashed border-[#D9D9D9] bg-white p-6 text-center text-[12px] text-[#777]">
                    No documents on file.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {documents.map((doc) => {
                        const badge = DOCUMENT_STATUS_BADGE[doc.status]
                        const isImage = doc.mimeType.startsWith("image/")
                        const saving = reviewingIds.includes(doc.id)
                        const rejecting = rejectingId === doc.id

                        return (
                            <div key={doc.id} className="rounded-[10px] border border-[#E5E5E5] bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[#F0F0F0]">
                                            <FileText className="h-5 w-5 text-[#555]" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-[13px] font-semibold text-[#252525]">
                                                {KYC_DOCUMENTS[doc.documentType].title}
                                            </h3>
                                            <p className="truncate text-[10px] text-[#777]">
                                                Uploaded on {formatDate(doc.createdAt)} • {formatSize(doc.fileSize)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium ${badge.className}`}>
                                        {badge.label}
                                    </span>
                                </div>

                                <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 block overflow-hidden rounded-[7px]"
                                    title="Open full size"
                                >
                                    {isImage ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- S3 host isn't configured for next/image
                                        <img
                                            src={doc.fileUrl}
                                            alt={KYC_DOCUMENTS[doc.documentType].title}
                                            className="h-40 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-40 items-center justify-center bg-[#F5F5F5]">
                                            <div className="text-center">
                                                <FileText className="mx-auto mb-2 h-8 w-8 text-[#777]" />
                                                <p className="max-w-62.5 truncate text-[11px] font-medium">{doc.fileName}</p>
                                                <p className="text-[9px] text-[#888]">PDF Document</p>
                                            </div>
                                        </div>
                                    )}
                                </a>

                                {doc.status === "REJECTED" && doc.rejectionReason && (
                                    <p className="mt-3 text-[11px] text-red-500">Reason: {doc.rejectionReason}</p>
                                )}

                                {rejecting ? (
                                    <form
                                        className="mt-3 space-y-2"
                                        onSubmit={(event) => {
                                            event.preventDefault()
                                            if (!reason.trim()) return
                                            submit([{ documentId: doc.id, action: "REJECT", reason: reason.trim() }])
                                        }}
                                    >
                                        <Textarea
                                            autoFocus
                                            rows={2}
                                            maxLength={300}
                                            value={reason}
                                            onChange={(event) => setReason(event.target.value)}
                                            placeholder="Why is this document rejected? The user will see this."
                                            className="resize-none text-[12px]"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={saving}
                                                onClick={() => setRejectingId(null)}
                                                className="h-8 px-4 text-[10px]"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={saving || !reason.trim()}
                                                className="h-8 bg-red-500 px-4 text-[10px] text-white hover:bg-red-600"
                                            >
                                                {saving ? "Saving..." : "Reject document"}
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="mt-3 flex items-center justify-between">
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-[10px] text-[#444]"
                                        >
                                            <Maximize className="h-5 w-5" />
                                            View full size
                                        </a>

                                        {doc.status === "PENDING" && canReview && (
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={busy}
                                                    onClick={() => startReject(doc.id)}
                                                    className="h-8 border-red-400 px-4 text-[10px] text-red-500 hover:bg-red-50 hover:text-red-500"
                                                >
                                                    <X className="mr-1 h-3.5 w-3.5" />
                                                    Reject
                                                </Button>
                                                <Button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => submit([{ documentId: doc.id, action: "APPROVE" }])}
                                                    className="h-8 bg-[#16A34A] px-4 text-[10px] text-white hover:bg-[#15803D]"
                                                >
                                                    <Check className="mr-1 h-3.5 w-3.5" />
                                                    {saving ? "Saving..." : "Approve"}
                                                </Button>
                                            </div>
                                        )}

                                        {doc.status === "APPROVED" && (
                                            <span className="flex items-center gap-1 text-[10px] font-medium text-[#16A34A]">
                                                <Check className="h-4 w-4" />
                                                Approved{doc.verifiedAt && ` on ${formatDate(doc.verifiedAt)}`}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
