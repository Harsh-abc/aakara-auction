// =====================================================================
// Which dashboard pages each role can open — the one list the sidebar,
// DashboardGuard (blocks the page) and in-page links all read.
//
//   SUPER_ADMIN  every page
//   ADMIN        Auctions & Lots (create, live, past, upcoming) + Manage Bidders + Proxy Bids
//   AUCTIONEER   Live Auctions, Bidding Console, Manage Bidders, Bid History, Proxy Bids
//   OPERATIONS   Create Auctions, Proxy Bids (the on / off switches only)
//   (every role) the Dashboard home, and Settings → General (their own profile)
//
// Rules are checked top to bottom and the first match wins, so the more
// specific paths come first. A page no rule matches is super-admin only.
// =====================================================================

type Role = "SUPER_ADMIN" | "ADMIN" | "AUCTIONEER" | "OPERATIONS"

const SA: Role = "SUPER_ADMIN"

const PAGE_RULES: { path: RegExp; roles: Role[] }[] = [
    // home
    { path: /^\/dashboard\/?$/, roles: [SA, "ADMIN", "AUCTIONEER", "OPERATIONS"] },

    // your own profile: the settings overview and General (Team / Activity Logs stay super admin only)
    { path: /^\/dashboard\/settings(\/general)?\/?$/, roles: [SA, "ADMIN", "AUCTIONEER", "OPERATIONS"] },

    // Manage Bidders: the list, an auction's registrations and a lot's bidders
    { path: /^\/dashboard\/auctions\/manage-bidders(\/|$)/, roles: [SA, "ADMIN", "AUCTIONEER"] },
    { path: /^\/dashboard\/auctions\/[^/]+\/(registrations|lots\/[^/]+\/bidders)(\/|$)/, roles: [SA, "ADMIN", "AUCTIONEER"] },

    // Auctions & Lots
    { path: /^\/dashboard\/auctions\/live-auctions(\/|$)/, roles: [SA, "ADMIN", "AUCTIONEER"] }, // incl. a sale's console
    { path: /^\/dashboard\/auctions\/(past|upcoming)-auctions(\/|$)/, roles: [SA, "ADMIN"] },
    { path: /^\/dashboard\/auctions\/(create-auctions|manage-lots)(\/|$)/, roles: [SA, "ADMIN", "OPERATIONS"] },
    { path: /^\/dashboard\/auctions\/[^/]+\/edit(\/|$)/, roles: [SA, "ADMIN"] }, // editing is super admin / admin in the API
    { path: /^\/dashboard\/auctions\/?$/, roles: [SA, "ADMIN", "OPERATIONS"] }, // "Create Auctions"
    // one auction's page — linked from every auction list, the home page and the live floor
    { path: /^\/dashboard\/auctions\/[^/]+\/?$/, roles: [SA, "ADMIN", "AUCTIONEER", "OPERATIONS"] },

    // running the sale
    { path: /^\/dashboard\/bidding-console(\/|$)/, roles: [SA, "AUCTIONEER"] },
    { path: /^\/dashboard\/bid-history(\/|$)/, roles: [SA, "AUCTIONEER"] },
    // admin / operations switch proxy bidding on and off per auction (operations see only the switches)
    { path: /^\/dashboard\/proxy-bids(\/|$)/, roles: [SA, "ADMIN", "AUCTIONEER", "OPERATIONS"] },
    // live video studio (header "Go live" button) — the roles that can host in the API
    { path: /^\/dashboard\/go-live(\/|$)/, roles: [SA, "ADMIN", "AUCTIONEER"] },

    // Artworks, User, Bidders, Settings and anything new: no rule → super admin only
]

/** True when `role` may open the dashboard page at `pathname` (query / hash ignored). */
export const canAccessPage = (pathname: string, role: string | null | undefined) => {
    if (!role) return false
    if (role === SA) return true
    const path = pathname.split(/[?#]/)[0]
    const rule = PAGE_RULES.find((r) => r.path.test(path))
    return !!rule && (rule.roles as string[]).includes(role)
}
