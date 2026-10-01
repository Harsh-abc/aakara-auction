// roles allowed into /dashboard — BIDDER is intentionally excluded
export const DASHBOARD_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER", "STAFF"]

export const canAccessDashboard = (role: string | null | undefined) =>
    !!role && DASHBOARD_ROLES.includes(role)
