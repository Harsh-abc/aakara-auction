
const BASE_URL = process.env.NEXT_PUBLIC_AUTH_BASE_URL;



export const authEndPoints = {
    LOGIN_API: `${BASE_URL}/api/auth/login`,
    REGISTER_API: `${BASE_URL}/api/auth/register`,
    VERIFY_OTP_API: `${BASE_URL}/api/auth/verify-otp`,

}

export const auctionEndPoints = {
    CREATE_AUCTION_API: `${BASE_URL}/api/auction/create-auction`,
    GET_AUCTION_API: `${BASE_URL}/api/auction/getAuction`,
    GET_LOTS_BY_AUCTION: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/getLots/${auctionUuid}/lots`,
    DELETE_AUCTION_API: (auctionUuid: string) =>
        `${BASE_URL}/api/auction/delete-auction/${auctionUuid}`,
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
    UPLOAD_USER_KYC_API: (uuid: string) => `${BASE_URL}/api/users/${uuid}/kyc`
};

export const profileEndpoints = {
    GET_MY_PROFILE_API: `${BASE_URL}/api/users/me/profile`,
    UPDATE_MY_PROFILE_API: `${BASE_URL}/api/users/me/update-profile`,
}