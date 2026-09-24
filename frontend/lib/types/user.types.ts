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

export interface UserKyc {
    kycType: string;
    status: string;
    submittedAt: string | null;
    verifiedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
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
    profile: UserProfile | null;
    kyc: UserKyc | null;
    _count: { bids: number; auctionsWon: number; auctionParticipations: number };
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
}

export interface GetAllUsersResponse {
    success: boolean;
    message: string;
    data: {
        users: User[];
        pagination: Pagination;
    };
}


export interface GetUserByIdResponse {
    success: boolean;
    message: string;
    data: User;
}