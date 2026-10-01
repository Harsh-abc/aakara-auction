// roles allowed into /dashboard — BIDDER is intentionally excluded
export const DASHBOARD_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER", "STAFF"]

export const canAccessDashboard = (role: string | null | undefined) =>
    !!role && DASHBOARD_ROLES.includes(role)

// must match changeRoleSchema in backend/src/validations/role.validation.js
export const ALL_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "AUCTIONEER", "BIDDER"] as const

export type RoleName = (typeof ALL_ROLES)[number]

// must match MAX_SUPER_ADMINS in backend/src/services/admin.services.js
export const MAX_SUPER_ADMINS = 3

export const ROLE_LABELS: Record<RoleName, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    STAFF: "Staff",
    AUCTIONEER: "Auctioneer",
    BIDDER: "Bidder",
}
