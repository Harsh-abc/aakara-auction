"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { getMyKyc, submitMyKyc } from "@/services/operations/profile.api"
import type { KycStatus, MyKyc, MyKycDocument } from "@/lib/types/profile.types"
import type { DocumentType, KycType } from "@/lib/types/user.types"
import {
    KYC_ALLOWED_TYPES,
    KYC_DOCUMENT_GROUPS,
    KYC_DOCUMENTS,
    KYC_MAX_SIZE,
} from "@/lib/constants/kyc"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/apiError"
import { ProfileButton, ProfileSection } from "./ProfileUI"

const KYC_TYPE_LABELS: Record<KycType, string> = {
    INDIVIDUAL: "Individual",
    BUSINESS: "Business",
}

const STATUS_MESSAGES: Record<KycStatus, string> = {
    NOT_SUBMITTED:
        "Upload your documents to verify your identity. You need to be verified before you can be approved to bid.",
    PENDING: "Your documents are with our team for review. This page will update once they've been checked.",
    UNDER_REVIEW: "Your documents are with our team for review. This page will update once they've been checked.",
    VERIFIED:
        "Your identity is verified. You can still add other documents below — our team will review them without affecting your verification.",
    REJECTED: "We couldn't verify your documents. Replace the rejected ones below and submit again.",
}

const ACCEPT = KYC_ALLOWED_TYPES.join(",")

const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

// a document in these states counts towards a requirement and can't be re-uploaded
const isActive = (doc?: MyKycDocument) => doc?.status === "PENDING" || doc?.status === "APPROVED"

type KycDocumentsFormProps = {
    onKycChange: (kyc: MyKyc) => void
}

export function KycDocumentsForm({ onKycChange }: KycDocumentsFormProps) {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [kyc, setKyc] = useState<MyKyc | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)

    const [kycType, setKycType] = useState<KycType>("INDIVIDUAL")
    const [selected, setSelected] = useState<Partial<Record<DocumentType, File>>>({})
    const [fileErrors, setFileErrors] = useState<Partial<Record<DocumentType, string>>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setLoadError(false)
        try {
            const data = await getMyKyc(token)
            setKyc(data)
            if (data) setKycType(data.kycType)
        } catch {
            setLoadError(true)
        } finally {
            setLoading(false)
        }
    }, [token])

    // load once; later token refreshes must not reload and drop the files the user picked
    const loadedRef = useRef(false)
    useEffect(() => {
        if (loadedRef.current) return
        loadedRef.current = true
        load()
    }, [load])

    const status: KycStatus = kyc?.status ?? "NOT_SUBMITTED"
    // a verified KYC still takes more documents, but its type is settled
    const verified = status === "VERIFIED"

    const documents = kyc?.documents ?? []
    const currentDoc = (type: DocumentType) => documents.find((doc) => doc.documentType === type)
    const otherDocs = documents.filter((doc) => doc.documentType === "OTHERS")
    const requested = new Set(kyc?.requestedDocuments ?? [])

    // "OTHERS" can always take another file; other types whenever nothing is on file or it was rejected
    const canUpload = (type: DocumentType) => type === "OTHERS" || !isActive(currentDoc(type))

    // a group outside this KYC type still shows when our team asked for something in it
    const groups = KYC_DOCUMENT_GROUPS.filter(
        (group) => group.shownFor.includes(kycType) || group.types.some((type) => requested.has(type))
    )
    const visibleTypes = groups.flatMap((group) => group.types)

    const isGroupSatisfied = (types: DocumentType[]) =>
        types.some((type) => isActive(currentDoc(type)) || selected[type])

    const handleFile = (type: DocumentType, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = "" // so picking the same file again still fires onChange
        if (!file) return

        let error: string | undefined
        if (!KYC_ALLOWED_TYPES.includes(file.type)) error = "Use a JPG, PNG, WEBP or PDF file"
        else if (file.size > KYC_MAX_SIZE) error = "File must be 5 MB or smaller"

        setFileErrors((prev) => ({ ...prev, [type]: error }))
        setFormError(null)
        if (!error) setSelected((prev) => ({ ...prev, [type]: file }))
    }

    const removeSelected = (type: DocumentType) => {
        setSelected((prev) => {
            const next = { ...prev }
            delete next[type]
            return next
        })
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        // a business-only file picked before switching to Individual isn't sent
        const toSend = visibleTypes.filter((type) => selected[type])

        if (toSend.length === 0) {
            setFormError("Choose at least one document to upload")
            return
        }

        const missing = groups.find((group) => group.requiredFor.includes(kycType) && !isGroupSatisfied(group.types))
        if (missing) {
            setFormError(`${missing.title}: upload at least one of these documents`)
            document.getElementById(`kyc-group-${missing.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
            return
        }

        const formData = new FormData()
        formData.append("kycType", kycType)
        formData.append("documents", JSON.stringify(toSend.map((documentType) => ({ documentType }))))
        toSend.forEach((type, i) => formData.append(`document_${i}`, selected[type] as File))

        setSubmitting(true)
        setFormError(null)

        try {
            const updated = await submitMyKyc(formData, token)
            setKyc(updated)
            setSelected({})
            setFileErrors({})
            onKycChange(updated)
            toast.success(verified ? "Documents sent to our team for review" : "Documents submitted for verification")
        } catch (error) {
            setFormError(getErrorMessage(error))
        } finally {
            setSubmitting(false)
        }
    }

    if (loading || loadError) {
        return (
            <ProfileSection title="KYC documents">
                {loadError ? (
                    <div className="text-sm text-neutral-600">
                        <p>We couldn&apos;t load your documents.</p>
                        <button
                            type="button"
                            onClick={load}
                            className="mt-4 h-10 cursor-pointer bg-neutral-950 px-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white hover:bg-neutral-800"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <div aria-busy="true" aria-label="Loading your documents" className="animate-pulse space-y-3">
                        <div className="h-14 bg-neutral-100" />
                        <div className="h-40 bg-neutral-100" />
                    </div>
                )}
            </ProfileSection>
        )
    }

    const selectedCount = visibleTypes.filter((type) => selected[type]).length

    const renderUploadRow = (type: DocumentType, existing?: MyKycDocument) => (
        <DocumentRow
            key={type}
            type={type}
            existing={existing}
            file={selected[type]}
            error={fileErrors[type]}
            canUpload={canUpload(type)}
            requested={requested.has(type)}
            disabled={submitting}
            onFile={(event) => handleFile(type, event)}
            onRemove={() => removeSelected(type)}
        />
    )

    return (
        <ProfileSection
            title="KYC documents"
            description="JPG, PNG, WEBP or PDF, up to 5 MB each. Only the documents marked required are mandatory."
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
                <div
                    role="status"
                    className={cn(
                        "border px-4 py-3 text-xs leading-relaxed",
                        status === "VERIFIED" && "border-emerald-700/40 bg-emerald-50 text-emerald-900",
                        status === "REJECTED" && "border-red-300 bg-red-50 text-red-900",
                        (status === "PENDING" || status === "UNDER_REVIEW") && "border-[#C9A36A] bg-[#FBEEDC] text-neutral-900",
                        status === "NOT_SUBMITTED" && "border-neutral-200 bg-neutral-50 text-neutral-700"
                    )}
                >
                    <p className="text-[10px] uppercase tracking-[0.18em]">{statusLabel(status)}</p>
                    <p className="mt-1">{STATUS_MESSAGES[status]}</p>
                    {status === "REJECTED" && kyc?.rejectionReason && (
                        <p className="mt-1">Reason: {kyc.rejectionReason}</p>
                    )}
                </div>

                {requested.size > 0 && (
                    <div role="status" className="border border-[#C9A36A] bg-[#FBEEDC] px-4 py-3 text-xs leading-relaxed text-neutral-900">
                        <p className="text-[10px] uppercase tracking-[0.18em]">Requested by our team</p>
                        <p className="mt-1">
                            Please upload:{" "}
                            {[...requested].map((type) => KYC_DOCUMENTS[type].title).join(", ")}.
                        </p>
                        {kyc?.requestNote && <p className="mt-1">&ldquo;{kyc.requestNote}&rdquo;</p>}
                    </div>
                )}

                <fieldset disabled={verified || submitting}>
                    <legend className="mb-3 block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                        Verifying as
                    </legend>
                    <div className="flex flex-wrap gap-3">
                        {(Object.keys(KYC_TYPE_LABELS) as KycType[]).map((type) => (
                            <label
                                key={type}
                                className={cn(
                                    "flex h-11 cursor-pointer items-center gap-2.5 border px-4 text-xs uppercase tracking-[0.18em]",
                                    kycType === type ? "border-neutral-900 text-neutral-900" : "border-neutral-300 text-neutral-500"
                                )}
                            >
                                <input
                                    type="radio"
                                    name="kycType"
                                    value={type}
                                    checked={kycType === type}
                                    onChange={() => {
                                        setKycType(type)
                                        setFormError(null)
                                    }}
                                    className="h-4 w-4 accent-neutral-900"
                                />
                                {KYC_TYPE_LABELS[type]}
                            </label>
                        ))}
                    </div>
                </fieldset>

                {groups.map((group) => {
                    const required = group.requiredFor.includes(kycType)
                    const satisfied = isGroupSatisfied(group.types)
                    const groupRequested = group.types.some((type) => requested.has(type))

                    return (
                        <div key={group.id} id={`kyc-group-${group.id}`}>
                            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-2">
                                <h3 className="text-sm text-neutral-950">{group.title}</h3>
                                <p
                                    className={cn(
                                        "text-[10px] uppercase tracking-[0.18em]",
                                        required && !satisfied ? "text-red-600" : "text-neutral-500"
                                    )}
                                >
                                    {!required
                                        ? groupRequested ? "Requested" : "Optional"
                                        : group.types.length > 1
                                            ? satisfied ? "Required · provided" : "Required · upload at least one"
                                            : satisfied ? "Required · provided" : "Required"}
                                </p>
                            </div>

                            <ul>
                                {group.types.map((type) =>
                                    type === "OTHERS" ? (
                                        // already-submitted "other" documents, then a slot for a new one
                                        <Fragment key={type}>
                                            {otherDocs.map((doc) => (
                                                <DocumentRow key={doc.id} type={type} existing={doc} />
                                            ))}
                                            {renderUploadRow(type)}
                                        </Fragment>
                                    ) : (
                                        renderUploadRow(type, currentDoc(type))
                                    )
                                )}
                            </ul>
                        </div>
                    )
                })}

                <div className="flex flex-col gap-3">
                    {formError && (
                        <p role="alert" className="text-xs text-red-600">
                            {formError}
                        </p>
                    )}
                    <div>
                        <ProfileButton loading={submitting} loadingText="Uploading...">
                            {selectedCount > 0
                                ? `Submit ${selectedCount} document${selectedCount === 1 ? "" : "s"}`
                                : "Submit for verification"}
                        </ProfileButton>
                    </div>
                </div>
            </form>
        </ProfileSection>
    )
}

function statusLabel(status: KycStatus) {
    if (status === "VERIFIED") return "Verified"
    if (status === "REJECTED") return "Action needed"
    if (status === "NOT_SUBMITTED") return "Not submitted"
    return "Under review"
}

const DOCUMENT_STATUS_LABELS: Record<MyKycDocument["status"], string> = {
    PENDING: "Under review",
    APPROVED: "Verified",
    REJECTED: "Rejected",
}

// without onFile/canUpload the row is read-only (a document already on file)
type DocumentRowProps = {
    type: DocumentType
    existing?: MyKycDocument
    file?: File
    error?: string
    canUpload?: boolean
    // our team asked for this one
    requested?: boolean
    disabled?: boolean
    onFile?: (event: React.ChangeEvent<HTMLInputElement>) => void
    onRemove?: () => void
}

function DocumentRow({
    type,
    existing,
    file,
    error,
    canUpload = false,
    requested = false,
    disabled = false,
    onFile,
    onRemove,
}: DocumentRowProps) {
    const { title, hint } = KYC_DOCUMENTS[type]
    const inputId = `kyc-file-${type}${existing ? `-${existing.id}` : ""}`

    let detail = hint
    if (file) detail = `${file.name} · ${formatSize(file.size)} · ready to submit`
    else if (existing?.status === "REJECTED") detail = existing.rejectionReason || "Please upload a clearer copy"
    else if (existing) detail = existing.fileName

    return (
        <li className="flex flex-col gap-3 border-b border-neutral-100 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-900">
                    {title}
                    {requested && !file && !isActive(existing) && (
                        <span className="bg-[#FBEEDC] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[#9a7442]">
                            Requested
                        </span>
                    )}
                </p>
                <p
                    className={cn(
                        "mt-0.5 truncate text-xs",
                        !file && existing?.status === "REJECTED" ? "text-red-600" : "text-neutral-500"
                    )}
                >
                    {detail}
                </p>
                {error && (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                        {error}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-4">
                {existing && !file && (
                    <>
                        <span
                            className={cn(
                                "text-[10px] uppercase tracking-[0.18em]",
                                existing.status === "APPROVED" && "text-emerald-700",
                                existing.status === "PENDING" && "text-[#9a7442]",
                                existing.status === "REJECTED" && "text-red-600"
                            )}
                        >
                            {DOCUMENT_STATUS_LABELS[existing.status]}
                        </span>
                        <a
                            href={existing.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                        >
                            View
                        </a>
                    </>
                )}

                {file ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:cursor-not-allowed"
                    >
                        Remove
                    </button>
                ) : (
                    canUpload && (
                        <label
                            htmlFor={inputId}
                            className={cn(
                                "inline-flex h-9 cursor-pointer items-center border border-neutral-900 px-4 text-[11px] uppercase tracking-[0.18em] text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white has-focus-visible:ring-2 has-focus-visible:ring-neutral-400",
                                disabled && "pointer-events-none opacity-60"
                            )}
                        >
                            {existing?.status === "REJECTED" ? "Replace" : "Upload"}
                            <input
                                id={inputId}
                                type="file"
                                accept={ACCEPT}
                                onChange={onFile}
                                disabled={disabled}
                                className="sr-only"
                            />
                        </label>
                    )
                )}
            </div>
        </li>
    )
}
