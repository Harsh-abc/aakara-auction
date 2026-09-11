
const BASE_URL = process.env.NEXT_AUTH_BASE_URL as string;



export const authEndPoints = {
    LOGIN_API : `${BASE_URL}/auth/login`,
    REGISTER_API : `${BASE_URL}/auth/register`,
    VERIFY_OTP_API : `${BASE_URL}/auth/verify-otp`,

}

