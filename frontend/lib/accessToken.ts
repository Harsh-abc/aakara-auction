// read the access token's payload (no library needed — the API checks the signature)

interface AccessTokenClaims {
    sub?: string
    exp?: number
    /** this login entered its Google Authenticator code (backend libs/dashboardMfa.js)… */
    mfa?: boolean
    /** …which opens the dashboard until this moment (epoch ms) — 6 hours after it was entered */
    mfaUntil?: number
}

export const readAccessToken = (token: string | null | undefined): AccessTokenClaims | null => {
    if (!token) return null
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
        return JSON.parse(atob(base64))
    } catch {
        return null
    }
}

/** When this login's authenticator code stops opening the dashboard (epoch ms), or null without one */
export const dashboardMfaUntil = (token: string | null | undefined) => {
    const claims = readAccessToken(token)
    return claims?.mfa === true && typeof claims.mfaUntil === "number" ? claims.mfaUntil : null
}

/** True while this login's authenticator code still opens the dashboard */
export const hasDashboardMfa = (token: string | null | undefined, now = Date.now()) => (dashboardMfaUntil(token) ?? 0) > now
