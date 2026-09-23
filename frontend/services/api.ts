
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