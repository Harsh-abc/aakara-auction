export type Gender = "MALE" | "FEMALE" | "OTHER"

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
}