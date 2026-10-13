import type { RoleName } from "@/lib/constants/roles";

export interface UserProfile {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    pincode: string | null;
    createdAt: string;
    updatedAt: string;
}

export type KycDocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface UserKycDocument {
    id: string;
    documentType: DocumentType;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: string;
    status: KycDocumentStatus;
    rejectionReason: string | null;
    verifiedAt: string | null;
    createdAt: string;
}

export interface UserKyc {
    kycType: KycType;
    status: string;
    submittedAt: string | null;
    verifiedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    // the rest only come on GET /users/:uuid
    // documents staff asked the user for; each drops off once uploaded
    requestedDocuments?: DocumentType[];
    requestNote?: string | null;
    requestedAt?: string | null;
    // newest document of each type; every "OTHERS" document
    documents?: UserKycDocument[];
    // only on GET /users (list): each non-rejected document type on file
    uploadedDocumentTypes?: DocumentType[];
}

export interface User {
    uuid: string;
    username: string;
    email: string;
    phone: string | null;
    status: string;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    phoneVerified: boolean;
    phoneVerifiedAt: string | null;
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    passwordChangedAt: string | null;
    failedLoginAttempts: number;
    lockedUntil: string | null;
    createdAt: string;
    updatedAt: string;
    role: { name: string };
    // only on GET /users/:uuid — who last set the role (e.g. made them a bidder) and when
    roleChangedAt?: string | null;
    roleChangedBy?: RoleChangedBy | null;
    profile: UserProfile | null;
    kyc: UserKyc | null;
    _count: { bids: number; auctionsWon: number; auctionParticipations: number };
}

export interface RoleChangedBy {
    uuid: string;
    username: string;
    profile: Pick<UserProfile, "firstName" | "lastName" | "displayName"> | null;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface GetAllUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    emailVerified?: "true" | "false";
    kycStatus?: string;
    role?: string;
}

export interface GetAllUsersResponse {
    success: boolean;
    message: string;
    data: {
        users: User[];
        pagination: Pagination;
    };
}


/** GET /users/stats — counts for the cards on the users page */
export interface UserStats {
    total: number;
    joinedThisMonth: number;
    bidders: number;
    /** bidders whose KYC is verified, so they can register and bid */
    biddersCanBid: number;
    newUsers: number;
    newUserDays: number;
    suspended: number;
}

export interface GetUserByIdResponse {
    success: boolean;
    message: string;
    data: User;
}

export type KycType = "INDIVIDUAL" | "BUSINESS";

export type DocumentType =
    | "PASSPORT"
    | "DRIVERS_LICENSE"
    | "NATIONAL_ID"
    | "AADHAAR"
    | "PAN_CARD"
    | "UTILITY_BILL"
    | "BANK_STATEMENT"
    | "BUSINESS_REGISTRATION" 
    | "OTHERS";

export interface KycDocumentInput {
    documentType: DocumentType;
    documentNumber?: string;
    file: File;
}

export interface UploadUserKycPayload {
    uuid: string;
    kycType: KycType;
    documents: KycDocumentInput[];
    onProgress?: (percent: number) => void;
}

export interface UploadUserKycResponse {
    success: boolean;
    message: string;
    data: {
        kycType: KycType;
        status: string;
        documentsUploaded: number;
        user: User;
    };
}

export interface KycDocumentReview {
    documentId: string;
    action: "APPROVE" | "REJECT";
    reason?: string;
}

export interface ReviewUserKycPayload {
    uuid: string;
    reviews: KycDocumentReview[];
}

export interface ReviewUserKycResponse {
    success: boolean;
    message: string;
    data: {
        kycStatus: string;
        user: User;
    };
}

export interface RequestKycDocumentsPayload {
    uuid: string;
    documentTypes: DocumentType[];
    note?: string;
}

export interface RequestKycDocumentsResponse {
    success: boolean;
    message: string;
    data: {
        emailSent: boolean;
        user: User;
    };
}

export interface CreateUserPayload {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    /** Settings → Team only (super admin). Omitted = BIDDER */
    roleName?: RoleName;
}

export interface ChangeUserRolePayload {
    uuid: string;
    roleName: string;
}

export interface ChangeUserRoleResponse {
    success: boolean;
    message: string;
    data: {
        uuid: string;
        email: string;
        roleId: string;
        roleName: string;
        roleChangedAt: string | null;
        roleChangedBy: RoleChangedBy | null;
    };
}

export interface ChangeUserStatusPayload {
    uuid: string;
    action: "SUSPEND" | "REACTIVATE";
}

export interface ChangeUserStatusResponse {
    success: boolean;
    message: string;
    data: {
        uuid: string;
        status: "SUSPENDED" | "ACTIVE";
    };
}

export interface CreateUserResponse {
    success: boolean;
    message: string;
    data: {
        uuid: string;
        username: string;
        email: string;
        phone: string;
        role: string;
        status: string;
        kycStatus: string;
        createdAt: string;
    };
}
