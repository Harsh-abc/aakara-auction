// shapes returned by /api/auth/mfa/* (backend/src/services/auth.services.js)

export interface MfaStatus {
    /** an authenticator is set up (the first code was confirmed) */
    enabled: boolean
    /** this login has entered its code */
    verified: boolean
    /** the account name the app shows — the login email */
    account: string
    issuer: string
    /** how long a code keeps the dashboard open (6 hours); then a new code is asked for */
    validForSeconds: number
}

export interface MfaSetup {
    account: string
    issuer: string
    /** base32 key, for typing in by hand */
    secret: string
    otpauthUrl: string
    /** PNG data URL of the otpauth:// link */
    qrCode: string
}
