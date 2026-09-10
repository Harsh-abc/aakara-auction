"use client"
import { useRef, useState } from "react"
import {
    FileText,
    CreditCard,
    MapPin,
    UserRound,
    CloudUpload,
    Check,
    Maximize,
    X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type DocumentStatus = "empty" | "pending" | "verified" | "rejected"

interface Document {
    id: string
    title: string
    uploadText: string
    icon: React.ReactNode
    accept?: string
}

const documents: Document[] = [
    {
        id: "passport",
        title: "Government ID (Passport)",
        uploadText: "Upload Passport",
        icon: <FileText className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "national-id",
        title: "National ID Card (Front & Back)",
        uploadText: "Upload Front & Back",
        icon: <CreditCard className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "address",
        title: "Proof of Address (Utility Bill)",
        uploadText: "Upload Utility Bill",
        icon: <MapPin className="h-5 w-5 text-[#555]" />,
    },
    {
        id: "selfie",
        title: "Selfie with ID",
        uploadText: "Upload Selfie",
        icon: <UserRound className="h-5 w-5 text-[#555]" />,
        accept: "image/png,image/jpeg,image/jpg",
    },
]

interface UploadedDocument {
    file: File
    preview: string | null
    status: DocumentStatus
}


export function KycUpload() {
    const [uploadedDocuments, setUploadedDocuments] = useState<
        Record<string, UploadedDocument>
    >({})

    const [activeDocument, setActiveDocument] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const allDocumentsUploaded =
        documents.every(
            (document) => uploadedDocuments[document.id]
        )



    const handleUploadClick = (
        documentId: string,
        accept?: string
    ) => {
        setActiveDocument(documentId)

        if (fileInputRef.current) {
            fileInputRef.current.accept =
                accept || "image/png,image/jpeg,image/jpg,application/pdf"

            fileInputRef.current.click()
        }
    }

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0]

        if (!file || !activeDocument) return

        if (file.size > 5 * 1024 * 1024) {
            alert("File size must be less than 5MB")
            return
        }

        let preview: string | null = null

        if (file.type.startsWith("image/")) {
            preview = URL.createObjectURL(file)
        }

        setUploadedDocuments((prev) => ({
            ...prev,
            [activeDocument]: {
                file,
                preview,
                status: "pending",
            },
        }))

        event.target.value = ""
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

    const handleVerifyAll = () => {
        setUploadedDocuments((prev) => {
            const updated = { ...prev }

            documents.forEach((document) => {
                if (updated[document.id]) {
                    updated[document.id] = {
                        ...updated[document.id],
                        status: "verified",
                    }
                }
            })

            return updated
        })
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

                {!allDocumentsUploaded ? (
                    <Button
                        type="button"
                        className="h-9 rounded-[6px] bg-[#F59E0B] px-4 text-[11px] font-medium text-white hover:bg-[#D97706]"
                    >
                        Request Documents
                    </Button>
                ) : (
                    <Button
                        type="button"
                        className="h-9 rounded-[6px] bg-[#16A34A] px-4 text-[11px] font-medium text-white hover:bg-[#15803D]"
                        onClick={() => {
                            handleVerifyAll
                        }}
                    >
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Verify All Documents
                    </Button>
                )}

            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                {documents.map((document) => {

                    const uploaded =
                        uploadedDocuments[document.id]

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

                                {getStatusBadge(
                                    uploaded?.status || "empty"
                                )}

                            </div>


                            {!uploaded && (
                                <button
                                    type="button"
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
                                    {uploaded.preview ? (
                                        <div className="relative mt-4 overflow-hidden rounded-[7px]">
                                            <img
                                                src={uploaded.preview}
                                                alt={document.title}
                                                className="h-[160px] w-full object-cover"
                                            />

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
                                        </div>
                                    ) : (
                                        <div className="mt-4 flex h-[110px] items-center justify-center rounded-[7px] bg-[#F5F5F5]">
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

                                    <div className="mt-3 flex items-center justify-between">

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    uploaded.preview
                                                ) {
                                                    window.open(
                                                        uploaded.preview,
                                                        "_blank"
                                                    )
                                                }
                                            }}
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