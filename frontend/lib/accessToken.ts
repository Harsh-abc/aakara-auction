// read the access token's payload (no library needed — the API checks the signature)

interface AccessTokenClaims {
    exp?: number
    /** this login entered its Google Authenticator code — the dashboard is open (backend libs/dashboardMfa.js) */
    mfa?: boolean
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

/** True once this login has entered its authenticator code */
export const hasDashboardMfa = (token: string | null | undefined) => readAccessToken(token)?.mfa === true
