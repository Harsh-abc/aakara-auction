// shapes returned by /api/admin/otp-limits (backend/src/libs/otpLimits.js)

/**
 * EMAIL_OTP   email codes per sign-up (register + resend) — counted by email
 * SIGNUP_SMS  SMS codes per sign-up — counted by email
 * PHONE_SMS   SMS codes to one phone number, whichever sign-up asks — counted by phone
 */
export type OtpLimitKind = "EMAIL_OTP" | "SIGNUP_SMS" | "PHONE_SMS"

export interface OtpLimit {
    kind: OtpLimitKind
    /** the email (EMAIL_OTP, SIGNUP_SMS) or phone number (PHONE_SMS) being counted */
    subject: string
    count: number
    max: number
    /** at the max — more codes are refused until the counter resets */
    limited: boolean
    /** time left on the counter when fetched; null = no expiry */
    expiresInMs: number | null
}

export interface OtpLimitList {
    limits: OtpLimit[]
    rules: Record<OtpLimitKind, { max: number; windowSeconds: number }>
}
