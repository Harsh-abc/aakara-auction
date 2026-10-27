export interface AuthUserProfile {
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
    avatarUrl?: string | null
}

export interface AuthUser {
    uuid: string
    username: string
    email: string
    roleId: string
    profile?: AuthUserProfile | null
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
    city?: string
    country?: string
}

// sent only with the first signup request; resends reuse the pending signup and need no token
export interface SignupRequest extends SignupPayload {
    recaptchaToken?: string
    // accepted in the terms dialog; the backend records the version on the new account
    acceptTerms: true
    termsVersion: string
}

export interface ResendOtpPayload {
    email: string
}

export interface VerifyOtpPayload {
    email: string;
    otp: string;
}

export interface LoginApiResponse {
    success: boolean
    message?: string
    data: {
        user: AuthUser;
        accessToken: string;
        role: string | null;
        permissions: string[];
    }
}

export interface RefreshTokenApiResponse {
    success: boolean
    message?: string
    data: {
        user: AuthUser
        accessToken: string
        role: string | null
        permissions: string[]
    }
}

export interface GenericApiResponse {
    success: boolean
    message?: string
}

// verify-otp (email step) / resend-phone-otp: whether the SMS code went out for the phone step
export interface SignupOtpStepResponse extends GenericApiResponse {
    data?: {
        nextStep?: "VERIFY_PHONE" | null
        phoneOtpSent?: boolean
        // why the SMS didn't go out (phoneOtpSent false)
        smsError?: string
        expiresInSeconds?: number
        resendInSeconds?: number
    }
}

export interface ResendPhoneOtpPayload {
    email: string
}