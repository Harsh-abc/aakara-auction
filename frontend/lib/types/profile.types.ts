import type { AuctionStatus, AuctionType } from "./auction.types"
import type { DocumentType, KycType } from "./user.types"

export type Gender = "MALE" | "FEMALE" | "OTHER"

export type KycStatus = "NOT_SUBMITTED" | "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED"

export interface UserProfile {
    firstName: string | null
    lastName: string | null
    displayName: string | null
    avatarUrl: string | null
    bio: string | null
    dateOfBirth: string | null
    gender: Gender | null
    address: string | null
    city: string | null
    state: string | null
    country: string | null
    pincode: string | null
    createdAt: string
    updatedAt: string
}

export interface MyAccount {
    uuid: string
    username: string
    email: string
    phone: string | null
    status: string
    emailVerified: boolean
    phoneVerified: boolean
    createdAt: string
    role: { name: string }
    profile: UserProfile | null
    kyc: {
        kycType: KycType
        status: KycStatus
        verifiedAt: string | null
        rejectionReason: string | null
    } | null
}

// fields PATCH /users/me/update-profile accepts as JSON ("" clears a field)
export type UpdateProfilePayload = Partial<
    Record<
        | "firstName"
        | "lastName"
        | "displayName"
        | "bio"
        | "gender"
        | "dateOfBirth"
        | "address"
        | "city"
        | "state"
        | "country"
        | "pincode"
        | "phone",
        string
    >
>

export interface ChangePasswordPayload {
    currentPassword: string
    newPassword: string
}

export type ParticipantStatus = "PENDING" | "APPROVED" | "REJECTED" | "BANNED"

export interface MyAuctionRegistration {
    paddleNumber: string
    status: ParticipantStatus
    registeredAt: string
    auction: {
        uuid: string
        title: string
        slug: string
        status: AuctionStatus
        auctionType: AuctionType
        coverImageUrl: string | null
        startTime: string
        endTime: string
        timezone: string
    }
}

export type KycDocumentStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface MyKycDocument {
    id: string
    documentType: DocumentType
    fileName: string
    fileUrl: string
    mimeType: string
    fileSize: string
    status: KycDocumentStatus
    rejectionReason: string | null
    createdAt: string
}

// GET /users/me/kyc — null until the user has submitted anything
export interface MyKyc {
    kycType: KycType
    status: KycStatus
    submittedAt: string | null
    verifiedAt: string | null
    rejectedAt: string | null
    rejectionReason: string | null
    // documents our team has asked for; each drops off once uploaded
    requestedDocuments: DocumentType[]
    requestNote: string | null
    requestedAt: string | null
    // newest document of each type; every "OTHERS" document
    documents: MyKycDocument[]
}
