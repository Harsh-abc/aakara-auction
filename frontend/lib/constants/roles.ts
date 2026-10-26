// roles allowed into /dashboard — BIDDER and USER are intentionally excluded
export const DASHBOARD_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER", "OPERATIONS"]

export const canAccessDashboard = (role: string | null | undefined) =>
    !!role && DASHBOARD_ROLES.includes(role)

// roles that run the floor: start / stop lots, enter floor bids, hammer
// (mirrors the lot /live, /hammer and /floor-bids routes in the backend)
export const LOT_CONTROL_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER"]

export const canControlLots = (role: string | null | undefined) =>
    !!role && LOT_CONTROL_ROLES.includes(role)

// must match changeRoleSchema in backend/src/validations/role.validation.js
export const ALL_ROLES = ["SUPER_ADMIN", "ADMIN", "OPERATIONS", "AUCTIONEER", "BIDDER", "USER"] as const

export type RoleName = (typeof ALL_ROLES)[number]

// must match MAX_SUPER_ADMINS in backend/src/services/admin.services.js
export const MAX_SUPER_ADMINS = 3

export const ROLE_LABELS: Record<RoleName, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    OPERATIONS: "Operations",
    AUCTIONEER: "Auctioneer",
    BIDDER: "Bidder",
    USER: "User",
}
