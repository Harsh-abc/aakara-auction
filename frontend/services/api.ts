
const BASE_URL = process.env.NEXT_PUBLIC_AUTH_BASE_URL;



export const authEndPoints = {
    LOGIN_API: `${BASE_URL}/api/auth/login`,
    REGISTER_API: `${BASE_URL}/api/auth/register`,
    VERIFY_OTP_API: `${BASE_URL}/api/auth/verify-otp`,
    VERIFY_PHONE_OTP_API: `${BASE_URL}/api/auth/verify-phone-otp`,
    LOGOUT_API: `${BASE_URL}/api/auth/logout`,
    REFRESH_API: `${BASE_URL}/api/auth/refresh`,

}

export const auctionEndPoints = {
    CREATE_AUCTION_API: `${BASE_URL}/api/auction/create-auction`,
    GET_AUCTION_API: `${BASE_URL}/api/auction/getAuction`,
    GET_LOTS_BY_AUCTION: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/getLots/${auctionUuid}/lots`,
    // Artworks — every lot of every auction (dashboard catalogue)
    ARTWORKS_API: `${BASE_URL}/api/auction/artworks`,
    ARTWORKS_SUMMARY_API: `${BASE_URL}/api/auction/artworks/summary`,
    ARTWORK_API: (lotUuid: string) => `${BASE_URL}/api/auction/artworks/${lotUuid}`,
    DELETE_AUCTION_API: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/delete-auction/${auctionUuid}`,
    UPDATE_AUCTION_API: (auctionUuid: string) => `${BASE_URL}/api/auction/update-auction/${auctionUuid}`,
    CHANGE_AUCTION_STATUS_API: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/change-status/${auctionUuid}`,
    GET_LIVE_AUCTIONS_API: `${BASE_URL}/api/auction/live`,
    GET_AUCTION_TIMELINE_API: `${BASE_URL}/api/auction/timeline`,
    GET_AUCTION_STATS_API: `${BASE_URL}/api/auction/stats`,
    GET_DASHBOARD_OVERVIEW_API: `${BASE_URL}/api/auction/dashboard/overview`,
    GET_DASHBOARD_CALENDAR_API: `${BASE_URL}/api/auction/dashboard/calendar`,
    GET_BID_HISTORY_AUCTIONS_API: `${BASE_URL}/api/auction/dashboard/bid-history`,
    GET_AUCTION_BID_HISTORY_API: (auctionUuid: string) => `${BASE_URL}/api/auction/dashboard/bid-history/${auctionUuid}`,
    GET_LOT_BID_HISTORY_API: (lotUuid: string) => `${BASE_URL}/api/auction/dashboard/bid-history/lots/${lotUuid}`,
    SET_LOT_LIVE_API: (lotUuid: string) => `${BASE_URL}/api/auction/lots/${lotUuid}/live`,
    HAMMER_LOT_API: (lotUuid: string) => `${BASE_URL}/api/auction/lots/${lotUuid}/hammer`,
    DELETE_LOT_API: (lotUuid: string) => `${BASE_URL}/api/auction/lots/${lotUuid}`,
    GET_LOT_SUMMARY_API: (lotUuid: string) => `${BASE_URL}/api/auction/lots/${lotUuid}/summary`,
    GET_LOT_BIDDERS_API: (lotUuid: string) => `${BASE_URL}/api/auction/lots/${lotUuid}/bidders`,
    VERIFY_LOT_BIDDERS_API: (lotUuid: string) => `${BASE_URL}/api/auction/lots/${lotUuid}/bidders/verify`,

    // Auction registrations — POST/DELETE on the same URL add/remove existing users
    AUCTION_PARTICIPANTS_API: (auctionUuid: string) => `${BASE_URL}/api/auction/${auctionUuid}/participants`,
    PARTICIPANT_CANDIDATES_API: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/${auctionUuid}/participants/candidates`,
    ADD_NEW_PARTICIPANT_API: (auctionUuid: string) => `${BASE_URL}/api/auction/${auctionUuid}/participants/new`,
    VERIFY_PARTICIPANTS_API: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/${auctionUuid}/participants/verify`,
};

// storefront — no login needed, except to register
export const publicAuctionEndPoints = {
    GET_PUBLIC_AUCTIONS_API: `${BASE_URL}/api/auction/public`,
    GET_FEATURED_AUCTION_API: `${BASE_URL}/api/auction/public/featured`,
    GET_PUBLIC_AUCTION_API: (auctionUuid: string) => `${BASE_URL}/api/auction/public/${auctionUuid}`,
    GET_PUBLIC_LOTS_API: (auctionUuid: string) => `${BASE_URL}/api/auction/public/${auctionUuid}/lots`,
    GET_PUBLIC_LOT_API: (auctionUuid: string, lotUuid: string) =>
        `${BASE_URL}/api/auction/public/${auctionUuid}/lots/${lotUuid}`,
    REGISTER_FOR_AUCTION_API: (auctionUuid: string) => `${BASE_URL}/api/auction/${auctionUuid}/register`,
};

// live bidding — bidders (verified on the lot) and the dashboard's activity panel
export const biddingEndPoints = {
    MY_LOT_STANDING_API: (lotUuid: string) => `${BASE_URL}/api/bidding/lots/${lotUuid}/me`,
    PLACE_BID_API: (lotUuid: string) => `${BASE_URL}/api/bidding/lots/${lotUuid}/bids`,
    SET_PROXY_BID_API: (lotUuid: string) => `${BASE_URL}/api/bidding/lots/${lotUuid}/proxy`,
    AUCTION_ACTIVITY_API: (auctionUuid: string) => `${BASE_URL}/api/bidding/auctions/${auctionUuid}/activity`,
    // auctioneer console
    AUCTION_CONSOLE_API: (auctionUuid: string) => `${BASE_URL}/api/bidding/auctions/${auctionUuid}/console`,
    FLOOR_BID_API: (lotUuid: string) => `${BASE_URL}/api/bidding/lots/${lotUuid}/floor-bids`,
    // hammer step 1: place the lot's proxy bids
    EXECUTE_PROXIES_API: (lotUuid: string) => `${BASE_URL}/api/bidding/lots/${lotUuid}/execute-proxies`,
    // proxy bids page (super admin / admin)
    PROXY_BIDS_API: `${BASE_URL}/api/bidding/proxy-bids`,
    PROXY_BIDS_SUMMARY_API: `${BASE_URL}/api/bidding/proxy-bids/summary`,
    PROXY_BIDS_EXPORT_API: `${BASE_URL}/api/bidding/proxy-bids/export`,
    // one lot's proxy bids (bid history, console)
    LOT_PROXIES_API: (lotUuid: string) => `${BASE_URL}/api/bidding/lots/${lotUuid}/proxies`,
};

// live video (LiveKit) — viewers watch (login optional); the dashboard studio goes live and moderates
export const liveStreamEndPoints = {
    VIEWER_TOKEN_API: (auctionUuid: string) => `${BASE_URL}/api/live/${auctionUuid}/token`,
    HOST_TOKEN_API: (auctionUuid: string) => `${BASE_URL}/api/live/${auctionUuid}/host-token`,
    ON_AIR_API: `${BASE_URL}/api/live/on-air`,
    REMOVE_VIEWER_API: (auctionUuid: string, identity: string) =>
        `${BASE_URL}/api/live/${auctionUuid}/viewers/${encodeURIComponent(identity)}/remove`,
    BANS_API: (auctionUuid: string) => `${BASE_URL}/api/live/${auctionUuid}/bans`,
    UNBAN_API: (auctionUuid: string, identity: string) =>
        `${BASE_URL}/api/live/${auctionUuid}/bans/${encodeURIComponent(identity)}`,
};

// Socket.IO is served by the same backend
export const SOCKET_URL = BASE_URL;

// server clock (epoch ms) — see lib/serverClock.ts
export const TIME_API = `${BASE_URL}/api/time`;


export const categoryEndPoints = {
    GET_ALL_CATEGORIES_API: `${BASE_URL}/api/category/get-all-category`,

    GET_CATEGORY_SUBCATEGORIES_API: (uuid: string) =>
        `${BASE_URL}/api/category/get-category/${uuid}/subcategories`,
};

export const currencyEndPoints = {
    GET_CURRENCIES_API: `${BASE_URL}/api/currency`,
};

// public — the signup form uses these before the user has an account
export const locationEndPoints = {
    GET_COUNTRIES_API: `${BASE_URL}/api/location/countries`,
    GET_CITIES_API: (isoCode: string) => `${BASE_URL}/api/location/countries/${isoCode}/cities`,
};


export const userEndPoints = {
    GET_ALL_USERS_API: `${BASE_URL}/api/users/get-all-users`,
    GET_USER_STATS_API: `${BASE_URL}/api/users/stats`,
    GET_USER_BY_ID_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}`,
    UPLOAD_USER_KYC_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/kyc`,
    REVIEW_USER_KYC_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/kyc/review`,
    REQUEST_KYC_DOCUMENTS_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/kyc/request`,
    SET_KYC_STATUS_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/kyc/status`,
    UPDATE_USER_DETAILS_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/details`,

};

export const profileEndpoints = {
    GET_MY_PROFILE_API: `${BASE_URL}/api/users/me/profile`,
    UPDATE_MY_PROFILE_API: `${BASE_URL}/api/users/me/update-profile`,
    CHANGE_MY_PASSWORD_API: `${BASE_URL}/api/users/me/change-password`,
    GET_MY_REGISTRATIONS_API: `${BASE_URL}/api/users/me/registrations`,
    // GET to read, POST (multipart) to submit documents
    MY_KYC_API: `${BASE_URL}/api/users/me/kyc`,
    // GET the saved lots; POST / DELETE one lot by uuid
    MY_GALLERY_API: `${BASE_URL}/api/users/me/gallery`,
    MY_GALLERY_LOT_API: (lotUuid: string) => `${BASE_URL}/api/users/me/gallery/${lotUuid}`,
}


// images placed inside rich-text fields (multipart, field "image")
export const uploadEndPoints = {
    EDITOR_IMAGE_API: `${BASE_URL}/api/image/editor-image`,
}

export const adminEndPoints = {
    CREATE_USER_API: `${BASE_URL}/api/admin/create-user`,
    CHANGE_USER_ROLE_API: (uuid: string) => `${BASE_URL}/api/admin/${uuid}/role`,
    CHANGE_USER_STATUS_API: (uuid: string) => `${BASE_URL}/api/admin/${uuid}/status`,
    // Settings → Activity Logs (super admin only)
    ACTIVITY_LOGS_API: `${BASE_URL}/api/admin/activity-logs`,
    ACTIVITY_LOG_SUMMARY_API: `${BASE_URL}/api/admin/activity-logs/summary`,
    ACTIVITY_LOGS_EXPORT_API: `${BASE_URL}/api/admin/activity-logs/export`,
}