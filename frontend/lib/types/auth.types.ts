export interface AuthUser {
    uuid: string
    username: string
    email: string
    roleId: string
}

export interface DecodedAccessToken {
    sub: string
    userId: string
    roleId: string
    sessionId: string
    role: string
    permissions: string[]
    iat: number
    exp: number
}

export interface AuthState {
    loading: boolean
    signupEmail: string | null
    accessToken: string | null
    user: AuthUser | null
    role: string | null
    permissions: string[]
}

export interface LoginPayload {
    email: string
    password: string
}

export interface SignupPayload {
    username: string
    email: string
    password: string
    phone?: string | null
}

export interface VerifyOtpPayload {
    email: string;
    otp: string;
}

export interface LoginApiResponse {
    success: boolean
    message?: string
    data: {
        user: AuthUser
        accessToken: string
    }
}

export interface RefreshTokenApiResponse {
    success: boolean
    message?: string
    data: {
        accessToken: string
    }
}

export interface GenericApiResponse {
    success: boolean
    message?: string
}