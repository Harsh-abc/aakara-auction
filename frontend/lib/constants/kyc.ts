import type { DocumentType, KycType } from "@/lib/types/user.types"

// one entry per value of the DocumentType enum in backend/prisma/schema.prisma
export const KYC_DOCUMENTS: Record<DocumentType, { title: string; hint: string }> = {
    PASSPORT: { title: "Passport", hint: "Photo page, clearly readable" },
    DRIVERS_LICENSE: { title: "Driving licence", hint: "Front and back" },
    NATIONAL_ID: { title: "National ID card", hint: "Front and back" },
    AADHAAR: { title: "Aadhaar card", hint: "Front and back; you may mask the first 8 digits" },
    PAN_CARD: { title: "PAN card", hint: "Needed for invoices above the tax threshold" },
    UTILITY_BILL: { title: "Utility bill", hint: "Proof of address, issued in the last 3 months" },
    BANK_STATEMENT: { title: "Bank statement", hint: "Showing your name and address, last 3 months" },
    BUSINESS_REGISTRATION: { title: "Business registration certificate", hint: "Certificate of incorporation, GST or equivalent" },
    OTHERS: { title: "Other supporting document", hint: "Anything else that helps us verify you" },
}

export const PHOTO_ID_TYPES: DocumentType[] = ["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID", "AADHAAR"]

export interface KycDocumentGroup {
    id: string
    title: string
    types: DocumentType[]
    // KYC types this group is shown for
    shownFor: KycType[]
    // KYC types that must include one document from this group.
    // Must match KYC_REQUIRED_DOCUMENTS in backend/src/services/user.services.js
    requiredFor: KycType[]
}

export const KYC_DOCUMENT_GROUPS: KycDocumentGroup[] = [
    {
        id: "photo-id",
        title: "Government photo ID",
        types: PHOTO_ID_TYPES,
        shownFor: ["INDIVIDUAL", "BUSINESS"],
        requiredFor: ["INDIVIDUAL", "BUSINESS"],
    },
    {
        id: "business",
        title: "Business documents",
        types: ["BUSINESS_REGISTRATION"],
        shownFor: ["BUSINESS"],
        requiredFor: ["BUSINESS"],
    },
    {
        id: "additional",
        title: "Additional documents",
        types: ["PAN_CARD", "UTILITY_BILL", "BANK_STATEMENT", "OTHERS"],
        shownFor: ["INDIVIDUAL", "BUSINESS"],
        requiredFor: [],
    },
]

// same list as KYC_ALLOWED_TYPES on the backend
export const KYC_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
export const KYC_MAX_SIZE = 5 * 1024 * 1024
