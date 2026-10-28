"use client"

import { useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import toast from "react-hot-toast"
import { FilePlus, Paperclip, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { AppDispatch, RootState } from "@/redux/store"
import { uploadUserKyc } from "@/services/operations/user.api"
import { KYC_ALLOWED_TYPES, KYC_DOCUMENT_GROUPS, KYC_DOCUMENTS, KYC_MAX_SIZE } from "@/lib/constants/kyc"
import type { DocumentType, User } from "@/lib/types/user.types"

// only super admins add documents on a user's behalf (the upload route also allows admins and
// staff, for the first-time upload form)
export const useCanAddKycDocuments = () => useSelector((state: RootState) => state.auth.role) === "SUPER_ADMIN"

const STATUS_LABEL: Record<string, string> = { APPROVED: "Approved", PENDING: "Pending review" }

export function KycAddDocumentsDialog({ user }: { user: User }) {
    const dispatch = useDispatch<AppDispatch>()
    const uploading = useSelector((state: RootState) => state.user.kycUploading)

    const [open, setOpen] = useState(false)
    const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({})
    const [error, setError] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const pickingFor = useRef<DocumentType | null>(null)

    const kycType = user.kyc?.kycType ?? "INDIVIDUAL"
    const documents = user.kyc?.documents ?? []
    const chosen = Object.entries(files) as [DocumentType, File][]

    // what's already on file for a type (newest wins), so the admin knows they're replacing it
    const onFile = (type: DocumentType) =>
        type === "OTHERS"
            ? undefined
            : documents.find((doc) => doc.documentType === type && doc.status !== "REJECTED")

    const handleOpenChange = (next: boolean) => {
        if (!next && uploading) return
        setOpen(next)
        if (next) {
            setFiles({})
            setError(null)
        }
    }

    const pick = (type: DocumentType) => {
        pickingFor.current = type
        fileInputRef.current?.click()
    }

    const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ""
        const type = pickingFor.current
        if (!file || !type) return

        if (!KYC_ALLOWED_TYPES.includes(file.type)) {
            setError("Only PDF, PNG, JPG or WEBP files are allowed.")
            return
        }
        if (file.size > KYC_MAX_SIZE) {
            setError("Each file must be 5 MB or smaller.")
            return
        }
        setError(null)
        setFiles((prev) => ({ ...prev, [type]: file }))
    }

    const remove = (type: DocumentType) =>
        setFiles((prev) => {
            const next = { ...prev }
            delete next[type]
            return next
        })

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (chosen.length === 0) return

        try {
            const response = await dispatch(
                uploadUserKyc({
                    uuid: user.uuid,
                    kycType,
                    documents: chosen.map(([documentType, file]) => ({ documentType, file })),
                })
            ).unwrap()

            if (response.data.status === "VERIFIED" || response.data.documentsComplete) toast.success(response.message)
            else toast(response.message, { icon: "⚠️" })
            setOpen(false)
        } catch (err) {
            setError(typeof err === "string" ? err : "Could not upload the documents. Try again.")
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        className="h-9 rounded-[6px] bg-[#491B3A] px-4 text-[11px] font-medium text-white hover:bg-[#491B3A]/90"
                    />
                }
            >
                <FilePlus className="mr-1.5 h-3.5 w-3.5" />
                Add documents
            </DialogTrigger>

            <DialogContent className="gap-5 bg-white p-6 sm:max-w-lg">
                <DialogHeader className="pr-10">
                    <DialogTitle className="text-xl font-bold">Add documents on their behalf</DialogTitle>
                    <DialogDescription className="text-[13px] text-[#62666F]">
                        Documents you add are marked approved and recorded as uploaded by you. A newer file replaces
                        the one on file for that document. The KYC is verified once the required documents are approved.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
                        {KYC_DOCUMENT_GROUPS.filter((group) => group.shownFor.includes(kycType)).map((group) => {
                            const required = group.requiredFor.includes(kycType)
                            return (
                                <div key={group.id}>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#555]">
                                        {group.title}
                                        <span className={`ml-2 font-normal normal-case ${required ? "text-red-500" : "text-[#999]"}`}>
                                            {required ? (group.types.length > 1 ? "required · any one" : "required") : "optional"}
                                        </span>
                                    </p>
                                    <div className="space-y-2">
                                        {group.types.map((type) => {
                                            const file = files[type]
                                            const existing = onFile(type)
                                            return (
                                                <div
                                                    key={type}
                                                    className="flex items-center gap-3 rounded-[6px] border border-[#E5E5E5] px-3 py-2 text-[13px]"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p>{KYC_DOCUMENTS[type].title}</p>
                                                        {file ? (
                                                            <p className="flex items-center gap-1 truncate text-[11px] text-[#16a34a]">
                                                                <Paperclip className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">{file.name}</span>
                                                            </p>
                                                        ) : (
                                                            existing && (
                                                                <p className="text-[11px] text-[#777]">
                                                                    On file · {STATUS_LABEL[existing.status] ?? existing.status}
                                                                </p>
                                                            )
                                                        )}
                                                    </div>
                                                    {file ? (
                                                        <button
                                                            type="button"
                                                            disabled={uploading}
                                                            onClick={() => remove(type)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-full text-[#777] hover:bg-[#F0F0F0]"
                                                            aria-label={`Remove ${KYC_DOCUMENTS[type].title}`}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={uploading}
                                                            onClick={() => pick(type)}
                                                            className="h-8 px-3 text-[11px]"
                                                        >
                                                            <Upload className="mr-1 h-3.5 w-3.5" />
                                                            {existing ? "Replace" : "Choose file"}
                                                        </Button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <p className="text-[11px] text-[#777]">PDF, PNG, JPG or WEBP, up to 5 MB each.</p>

                    {error && <p className="text-[12px] text-red-500">{error}</p>}

                    <DialogFooter className="mx-0 mb-0 grid grid-cols-2 gap-3 rounded-none border-t-0 bg-transparent p-0">
                        <DialogClose
                            disabled={uploading}
                            render={<Button type="button" variant="outline" className="h-11" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={uploading || chosen.length === 0}
                            className="h-11 bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                        >
                            {uploading
                                ? "Uploading..."
                                : `Add & approve${chosen.length > 0 ? ` (${chosen.length})` : ""}`}
                        </Button>
                    </DialogFooter>
                </form>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={KYC_ALLOWED_TYPES.join(",")}
                    className="hidden"
                    onChange={handleFile}
                />
            </DialogContent>
        </Dialog>
    )
}
