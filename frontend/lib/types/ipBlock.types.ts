// shapes returned by /api/admin/ip-blocks (backend/src/services/ipBlock.services.js)

export interface IpBlock {
    ip: string
    /** sign-ins from this IP are refused right now */
    blocked: boolean
    /** time left on the block when fetched; null when not blocked (or no expiry) */
    blockExpiresInMs: number | null
    /** failed sign-ins in the current window — the IP is blocked at rules.threshold */
    failedAttempts: number
    /** time left before the failure count resets */
    failuresExpireInMs: number | null
    /** the latest failed sign-in from this IP */
    lastAttemptAt: string | null
    userAgent: string | null
    /** emails tried from this IP (first few) and how many in all */
    emails: string[]
    emailCount: number
}

export interface IpBlockList {
    ips: IpBlock[]
    rules: { threshold: number; windowSeconds: number; blockSeconds: number }
}
