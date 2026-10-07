"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import toast from "react-hot-toast"
import { Mail, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
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
import { requestKycDocuments } from "@/services/operations/user.api"
import { KYC_DOCUMENT_GROUPS, KYC_DOCUMENTS } from "@/lib/constants/kyc"
import type { DocumentType, User } from "@/lib/types/user.types"

// must match the roles on POST /users/:uuid/kyc/request
const KYC_REQUEST_ROLES = ["SUPER_ADMIN", "ADMIN"]

export const useCanRequestKycDocuments = () => {
    const role = useSelector((state: RootState) => state.auth.role)
    return !!role && KYC_REQUEST_ROLES.includes(role)
}

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

/** The documents still outstanding from the user's last request, if any. */
export function KycRequestNotice({ user }: { user: User }) {
    const requested = user.kyc?.requestedDocuments ?? []
    if (requested.length === 0) return null

    return (
        <div className="mb-4 flex items-start gap-3 rounded-[8px] bg-[#fff4e8] px-4 py-3 text-[12px] text-[#9a5a12]">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
                <p>
                    Requested from the user
                    {user.kyc?.requestedAt && ` on ${formatDate(user.kyc.requestedAt)}`}, awaiting upload:{" "}
                    <span className="font-semibold">{requested.map((type) => KYC_DOCUMENTS[type].title).join(", ")}</span>
                </p>
                {user.kyc?.requestNote && <p className="mt-1 text-[#777]">Note: {user.kyc.requestNote}</p>}
            </div>
        </div>
    )
}

type KycRequestDialogProps = {
    user: User
    triggerClassName?: string
}

export function KycRequestDialog({ user, triggerClassName }: KycRequestDialogProps) {
    const dispatch = useDispatch<AppDispatch>()
    const sending = useSelector((state: RootState) => state.user.requestingKycDocuments)

    const [open, setOpen] = useState(false)
    const [chosen, setChosen] = useState<DocumentType[]>([])
    const [note, setNote] = useState("")

    const kycType = user.kyc?.kycType ?? "INDIVIDUAL"
    const documents = user.kyc?.documents ?? []
    const outstanding = user.kyc?.requestedDocuments ?? []

    // already on file and not rejected — nothing to ask for ("other" documents can always be added)
    const onFile = (type: DocumentType) =>
        type !== "OTHERS" &&
        documents.some((doc) => doc.documentType === type && (doc.status === "PENDING" || doc.status === "APPROVED"))

    // required groups with nothing approved or pending yet — what the user still has to provide
    const missingRequired = KYC_DOCUMENT_GROUPS.filter(
        (group) => group.requiredFor.includes(kycType) && !group.types.some(onFile)
    )

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) {
            // start from the current request, so re-sending edits it rather than starting over
            setChosen(outstanding.filter((type) => !onFile(type)))
            setNote(user.kyc?.requestNote ?? "")
        }
    }

    const toggle = (type: DocumentType, checked: boolean) =>
        setChosen((prev) => (checked ? [...prev, type] : prev.filter((t) => t !== type)))

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (chosen.length === 0) return

        try {
            const response = await dispatch(
                requestKycDocuments({ uuid: user.uuid, documentTypes: chosen, note: note.trim() })
            ).unwrap()

            if (response.data.emailSent) toast.success(`Request emailed to ${user.email}`)
            else toast(response.message, { icon: "⚠️" })
            setOpen(false)
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not send the request")
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        className={
                            triggerClassName ??
                            "h-9 rounded-[6px] bg-[#F59E0B] px-4 text-[11px] font-medium text-white hover:bg-[#D97706]"
                        }
                    />
                }
            >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {outstanding.length > 0 ? "Update request" : "Request documents"}
            </DialogTrigger>

            <DialogContent className="gap-5 bg-white p-6 sm:max-w-lg">
                <DialogHeader className="pr-10">
                    <DialogTitle className="text-xl font-bold">Request documents</DialogTitle>
                    <DialogDescription className="text-[13px] text-[#62666F]">
                        {user.email} gets an email, and the documents are flagged on their KYC tab until uploaded.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {missingRequired.length > 0 && (
                        <p className="rounded-[8px] bg-[#fff0f0] px-3 py-2 text-[12px] text-red-600">
                            Still missing for verification: {missingRequired.map((g) => g.title.toLowerCase()).join(", ")}
                            {missingRequired.some((g) => g.types.length > 1) && " (any one of the group is enough)"}.
                        </p>
                    )}

                    <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
                        {KYC_DOCUMENT_GROUPS.map((group) => {
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
                                            const held = onFile(type)
                                            return (
                                                <label
                                                    key={type}
                                                    className={`flex items-center gap-3 rounded-[6px] border border-[#E5E5E5] px-3 py-2 text-[13px] ${held ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[#FAFAFA]"
                                                        }`}
                                                >
                                                    <Checkbox
                                                        checked={chosen.includes(type)}
                                                        disabled={held}
                                                        onCheckedChange={(checked) => toggle(type, checked === true)}
                                                    />
                                                    <span className="flex-1">{KYC_DOCUMENTS[type].title}</span>
                                                    {held && <span className="text-[10px] text-[#16a34a]">On file</span>}
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div>
                        <label htmlFor="kyc-request-note" className="mb-1.5 block text-[12px] font-medium text-[#414141]">
                            Note to the user <span className="font-normal text-[#999]">(optional)</span>
                        </label>
                        <Textarea
                            id="kyc-request-note"
                            rows={3}
                            maxLength={500}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="e.g. Please upload a utility bill from the last 3 months showing your current address."
                            className="resize-none text-[13px]"
                        />
                    </div>

                    <DialogFooter className="mx-0 mb-0 grid grid-cols-2 gap-3 rounded-none border-t-0 bg-transparent p-0">
                        <DialogClose render={<Button type="button" variant="outline" className="h-11" />}>
                            Cancel
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={sending || chosen.length === 0}
                            className="h-11 bg-[#F59E0B] text-white hover:bg-[#D97706]"
                        >
                            {sending
                                ? "Sending..."
                                : `Send request${chosen.length > 0 ? ` (${chosen.length})` : ""}`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
