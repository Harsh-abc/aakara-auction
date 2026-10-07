
const BASE_URL = process.env.NEXT_PUBLIC_AUTH_BASE_URL;



export const authEndPoints = {
    LOGIN_API: `${BASE_URL}/api/auth/login`,
    REGISTER_API: `${BASE_URL}/api/auth/register`,
    VERIFY_OTP_API: `${BASE_URL}/api/auth/verify-otp`,
    LOGOUT_API: `${BASE_URL}/api/auth/logout`,
    REFRESH_API: `${BASE_URL}/api/auth/refresh`,

}

export const auctionEndPoints = {
    CREATE_AUCTION_API: `${BASE_URL}/api/auction/create-auction`,
    GET_AUCTION_API: `${BASE_URL}/api/auction/getAuction`,
    GET_LOTS_BY_AUCTION: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/getLots/${auctionUuid}/lots`,
    DELETE_AUCTION_API: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/delete-auction/${auctionUuid}`,
    UPDATE_AUCTION_API: (auctionUuid: string) => `${BASE_URL}/api/auction/update-auction/${auctionUuid}`,
    CHANGE_AUCTION_STATUS_API: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/change-status/${auctionUuid}`,
    GET_LIVE_AUCTIONS_API: `${BASE_URL}/api/auction/live`,
    GET_AUCTION_TIMELINE_API: `${BASE_URL}/api/auction/timeline`,
    SET_LOT_LIVE_API: (lotUuid: string) => `${BASE_URL}/api/auction/lots/${lotUuid}/live`,
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


export const categoryEndPoints = {
    GET_ALL_CATEGORIES_API: `${BASE_URL}/api/category/get-all-category`,

    GET_CATEGORY_SUBCATEGORIES_API: (uuid: string) =>
        `${BASE_URL}/api/category/get-category/${uuid}/subcategories`,
};

export const currencyEndPoints = {
    GET_CURRENCIES_API: `${BASE_URL}/api/currency`,
};


export const userEndPoints = {
    GET_ALL_USERS_API: `${BASE_URL}/api/users/get-all-users`,
    GET_USER_BY_ID_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}`,
    UPLOAD_USER_KYC_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/kyc`,
    REVIEW_USER_KYC_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/kyc/review`,
    REQUEST_KYC_DOCUMENTS_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/kyc/request`,

};

export const profileEndpoints = {
    GET_MY_PROFILE_API: `${BASE_URL}/api/users/me/profile`,
    UPDATE_MY_PROFILE_API: `${BASE_URL}/api/users/me/update-profile`,
    CHANGE_MY_PASSWORD_API: `${BASE_URL}/api/users/me/change-password`,
    GET_MY_REGISTRATIONS_API: `${BASE_URL}/api/users/me/registrations`,
    // GET to read, POST (multipart) to submit documents
    MY_KYC_API: `${BASE_URL}/api/users/me/kyc`,
}


export const adminEndPoints = {
    CREATE_USER_API: `${BASE_URL}/api/admin/create-user`,
    CHANGE_USER_ROLE_API: (uuid: string) => `${BASE_URL}/api/admin/${uuid}/role`,
}