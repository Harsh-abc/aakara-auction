"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import {
    FileText,
    CreditCard,
    MapPin,
    Car,
    Fingerprint,
    Landmark,
    Building2,
    FilePlus,
    Plus,
    CloudUpload,
    Check,
    Maximize,
    X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppDispatch, RootState } from "@/redux/store"
import { uploadUserKyc } from "@/services/operations/user.api"
import { DocumentType } from "@/lib/types/user.types"

type DocumentStatus = "empty" | "pending" | "verified" | "rejected"

interface Document {
    id: string
    documentType: DocumentType // value the backend expects
    title: string
    uploadText: string
    icon: React.ReactNode
    accept?: string
    removable?: boolean // only "Other" cards can be removed
}

// same list as KYC_ALLOWED_TYPES on the backend
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
const MAX_SIZE = 5 * 1024 * 1024

const documents: Document[] = [
    {
        id: "passport",
        documentType: "PASSPORT",
        title: "Government ID (Passport)",
        uploadText: "Upload Passport",
        icon: <FileText className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "drivers-license",
        documentType: "DRIVERS_LICENSE",
        title: "Driver's License",
        uploadText: "Upload Driver's License",
        icon: <Car className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "national-id",
        documentType: "NATIONAL_ID",
        title: "National ID Card (Front & Back)",
        uploadText: "Upload Front & Back",
        icon: <CreditCard className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "aadhaar",
        documentType: "AADHAAR",
        title: "Aadhaar Card (Front & Back)",
        uploadText: "Upload Aadhaar",
        icon: <Fingerprint className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "pan-card",
        documentType: "PAN_CARD",
        title: "PAN Card",
        uploadText: "Upload PAN Card",
        icon: <CreditCard className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "address",
        documentType: "UTILITY_BILL",
        title: "Proof of Address (Utility Bill)",
        uploadText: "Upload Utility Bill",
        icon: <MapPin className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "bank-statement",
        documentType: "BANK_STATEMENT",
        title: "Bank Statement",
        uploadText: "Upload Bank Statement",
        icon: <Landmark className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "business-registration",
        documentType: "BUSINESS_REGISTRATION",
        title: "Business Registration",
        uploadText: "Upload Registration Certificate",
        icon: <Building2 className="h-5 w-5 text-[#555]" />,
    },
]

interface UploadedDocument {
    file: File
    preview: string
    status: DocumentStatus
}

export function KycUpload({ uuid }: { uuid: string }) {
    const router = useRouter()
    const dispatch = useDispatch<AppDispatch>()
    const { kycUploading, kycUploadError } = useSelector((state: RootState) => state.user)

    const [uploadedDocuments, setUploadedDocuments] = useState<
        Record<string, UploadedDocument>
    >({})

    // ids of the extra "Other" cards added by the admin
    const [otherIds, setOtherIds] = useState<string[]>([])

    const [activeDocument, setActiveDocument] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // fixed cards + any "Other" cards
    const allCards: Document[] = [
        ...documents,
        ...otherIds.map((id, i) => ({
            id,
            documentType: "OTHERS" as DocumentType,
            title: `Other Document ${i + 1}`,
            uploadText: "Upload Document",
            icon: <FilePlus className="h-5 w-5 text-[#555]" />,
            removable: true,
        })),
    ]

    const uploadedCount = Object.keys(uploadedDocuments).length

    const hasRejected = Object.values(uploadedDocuments).some(
        (doc) => doc.status === "rejected"
    )

    // estimated progress: climbs to 90% while uploading
    useEffect(() => {
        if (!kycUploading) {
            setProgress(0)
            return
        }

        setProgress(5)
        const timer = setInterval(() => {
            setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) / 10) : p))
        }, 300)

        return () => clearInterval(timer)
    }, [kycUploading])

    const handleUploadClick = (
        documentId: string,
        accept?: string
    ) => {
        setActiveDocument(documentId)

        if (fileInputRef.current) {
            fileInputRef.current.accept =
                accept || "image/png,image/jpeg,image/jpg,image/webp,application/pdf"

            fileInputRef.current.click()
        }
    }

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0]
        event.target.value = ""

        if (!file || !activeDocument) return

        if (!ALLOWED_TYPES.includes(file.type)) {
            alert("Only PDF, PNG, JPG or WEBP files are allowed")
            return
        }

        if (file.size > MAX_SIZE) {
            alert("File size must be less than 5MB")
            return
        }

        setUploadedDocuments((prev) => ({
            ...prev,
            [activeDocument]: {
                file,
                preview: URL.createObjectURL(file), // works for images and PDFs
                status: "pending",
            },
        }))
    }

    const handleApprove = (documentId: string) => {
        setUploadedDocuments((prev) => ({
            ...prev,
            [documentId]: {
                ...prev[documentId],
                status: "verified",
            },
        }))
    }

    const handleReject = (documentId: string) => {
        setUploadedDocuments((prev) => ({
            ...prev,
            [documentId]: {
                ...prev[documentId],
                status: "rejected",
            },
        }))
    }

    const handleRemove = (documentId: string) => {
        const document = uploadedDocuments[documentId]

        if (document?.preview) {
            URL.revokeObjectURL(document.preview)
        }

        setUploadedDocuments((prev) => {
            const updated = { ...prev }

            delete updated[documentId]

            return updated
        })
    }

    const handleAddOther = () => {
        setOtherIds((prev) => [...prev, `other-${Date.now()}`])
    }

    // removes the whole "Other" card (and its file, if any)
    const handleRemoveOther = (documentId: string) => {
        handleRemove(documentId)
        setOtherIds((prev) => prev.filter((id) => id !== documentId))
    }

    const handleVerifyAll = async () => {
        if (uploadedCount === 0 || hasRejected || kycUploading) return

        // only send the cards that have a file
        const toUpload = allCards.filter((card) => uploadedDocuments[card.id])

        try {
            await dispatch(
                uploadUserKyc({
                    uuid,
                    kycType: "INDIVIDUAL",
                    documents: toUpload.map((card) => ({
                        documentType: card.documentType,
                        file: uploadedDocuments[card.id].file,
                    })),
                })
            ).unwrap()

            Object.values(uploadedDocuments).forEach((doc) =>
                URL.revokeObjectURL(doc.preview)
            )

            router.push("/dashboard/users")
        } catch {
            // message is shown from kycUploadError below
        }
    }

    const getStatusBadge = (status: DocumentStatus) => {
        if (status === "pending") {
            return (
                <span className="rounded-full bg-[#fff4e8] px-3 py-1 text-[10px] font-medium text-[#f28c28]">
                    Pending for review
                </span>
            )
        }

        if (status === "verified") {
            return (
                <span className="rounded-full bg-[#effbf3] px-3 py-1 text-[10px] font-medium text-[#16a34a]">
                    Verified
                </span>
            )
        }

        if (status === "rejected") {
            return (
                <span className="rounded-full bg-[#fff0f0] px-3 py-1 text-[10px] font-medium text-red-500">
                    Rejected
                </span>
            )
        }

        return (
            <span className="rounded-full bg-[#eeeeee] px-3 py-1 text-[10px] font-medium text-[#555]">
                Empty
            </span>
        )
    }

    return (
        <section className="mt-6">

            <div className="mb-4 flex items-center justify-between">

                <h2 className="text-[16px] font-semibold text-[#0F172A]">
                    Submitted Documents
                </h2>

                <div className="flex items-center gap-2">

                    <Button
                        type="button"
                        variant="outline"
                        disabled={kycUploading}
                        onClick={handleAddOther}
                        className="h-9 rounded-[6px] px-4 text-[11px] font-medium"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add Other Document
                    </Button>

                    {uploadedCount === 0 ? (
                        <Button
                            type="button"
                            className="h-9 rounded-[6px] bg-[#F59E0B] px-4 text-[11px] font-medium text-white hover:bg-[#D97706]"
                        >
                            Request Documents
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            disabled={hasRejected || kycUploading}
                            className="h-9 rounded-[6px] bg-[#16A34A] px-4 text-[11px] font-medium text-white hover:bg-[#15803D]"
                            onClick={handleVerifyAll}
                        >
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            {kycUploading
                                ? "Uploading..."
                                : `Verify ${uploadedCount} Document${uploadedCount > 1 ? "s" : ""}`}
                        </Button>
                    )}

                </div>

            </div>

            {kycUploading && (
                <div className="mb-4 space-y-1">
                    <div className="h-2 w-full rounded bg-[#E5E5E5]">
                        <div
                            className="h-2 rounded bg-[#16A34A] transition-all duration-300"
                            style={{ width: `${Math.round(progress)}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-[#777]">
                        Uploading documents… {Math.round(progress)}%
                    </p>
                </div>
            )}

            {hasRejected && (
                <p className="mb-4 text-[12px] text-red-500">
                    Replace the rejected document before verifying.
                </p>
            )}

            {kycUploadError && !kycUploading && (
                <p className="mb-4 text-[12px] text-red-500">{kycUploadError}</p>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                {allCards.map((document) => {

                    const uploaded =
                        uploadedDocuments[document.id]

                    const isImage = uploaded?.file.type.startsWith("image/")

                    return (
                        <div
                            key={document.id}
                            className="rounded-[10px] border border-[#E5E5E5] bg-white p-4 h-72.5"
                        >

                            <div className="flex items-start justify-between">

                                <div className="flex items-center gap-3">

                                    <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[#F0F0F0]">
                                        {document.icon}
                                    </div>

                                    <div>
                                        <h3 className="text-[13px] font-semibold text-[#252525]">
                                            {document.title}
                                        </h3>

                                        <p className="text-[10px] text-[#777]">
                                            {uploaded
                                                ? `Uploaded on ${new Date().toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    }
                                                )} • ${(
                                                    uploaded.file.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(1)} MB`
                                                : "No document uploaded"}
                                        </p>
                                    </div>

                                </div>

                                <div className="flex items-center gap-2">
                                    {getStatusBadge(
                                        uploaded?.status || "empty"
                                    )}

                                    {document.removable && !kycUploading && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOther(document.id)}
                                            className="flex h-6 w-6 items-center justify-center rounded-full text-[#777] hover:bg-[#F0F0F0]"
                                            title="Remove this card"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                            </div>


                            {!uploaded && (
                                <button
                                    type="button"
                                    disabled={kycUploading}
                                    onClick={() =>
                                        handleUploadClick(
                                            document.id,
                                            document.accept
                                        )
                                    }
                                    className="mt-4 flex h-[180px] w-full flex-col items-center justify-center rounded-[8px] border border-dashed border-[#D9D9D9] bg-[#FAFAFA] transition hover:bg-[#F5F5F5]"
                                >
                                    <CloudUpload className="mb-2 h-5 w-5 text-[#555]" />

                                    <span className="text-[11px] font-semibold text-[#444]">
                                        {document.uploadText}
                                    </span>

                                    <span className="mt-0.5 text-[9px] text-[#777]">
                                        PDF, PNG, or JPG up to 5MB
                                    </span>
                                </button>
                            )}

                            {uploaded && (
                                <>
                                    <div className="relative mt-4 overflow-hidden rounded-[7px]">
                                        {isImage ? (
                                            <img
                                                src={uploaded.preview}
                                                alt={document.title}
                                                className="h-[160px] w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-[160px] items-center justify-center bg-[#F5F5F5]">
                                                <div className="text-center">

                                                    <FileText className="mx-auto mb-2 h-8 w-8 text-[#777]" />

                                                    <p className="max-w-[250px] truncate text-[11px] font-medium">
                                                        {uploaded.file.name}
                                                    </p>

                                                    <p className="text-[9px] text-[#888]">
                                                        PDF Document
                                                    </p>

                                                </div>
                                            </div>
                                        )}

                                        {!kycUploading && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemove(
                                                        document.id
                                                    )
                                                }
                                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                window.open(
                                                    uploaded.preview,
                                                    "_blank"
                                                )
                                            }
                                            className="flex items-center gap-2 text-[10px] text-[#444]"
                                        >
                                            <Maximize className="h-5 w-5" />
                                            View full size
                                        </button>

                                        {uploaded.status ===
                                            "pending" && (
                                                <div className="flex gap-2">

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleReject(
                                                                document.id
                                                            )
                                                        }
                                                        className="h-8 border-red-400 px-4 text-[10px] text-red-500 hover:bg-red-50 hover:text-red-500"
                                                    >
                                                        Reject
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        onClick={() =>
                                                            handleApprove(
                                                                document.id
                                                            )
                                                        }
                                                        className="h-8 bg-[#16A34A] px-4 text-[10px] text-white hover:bg-[#15803D]"
                                                    >
                                                        <Check className="mr-1 h-3.5 w-3.5" />
                                                        Approve
                                                    </Button>

                                                </div>
                                            )}

                                        {uploaded.status ===
                                            "verified" && (
                                                <span className="flex items-center gap-1 text-[10px] font-medium text-[#16A34A]">
                                                    <Check className="h-4 w-4" />
                                                    Document verified
                                                </span>
                                            )}

                                        {uploaded.status ===
                                            "rejected" && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleRemove(
                                                            document.id
                                                        )
                                                    }
                                                    className="h-8 px-4 text-[10px]"
                                                >
                                                    Replace
                                                </Button>
                                            )}

                                    </div>
                                </>
                            )}

                        </div>
                    )
                })}

            </div>

            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
            />

        </section>
    )
}