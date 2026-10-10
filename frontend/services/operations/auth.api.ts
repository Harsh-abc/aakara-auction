import toast from "react-hot-toast";
import { authEndPoints } from "../api"
import { setSignupEmail } from "@/redux/slices/authSlice";
import { apiConnector } from "../apiConnector";

import { createAsyncThunk } from "@reduxjs/toolkit";
const { LOGIN_API, REGISTER_API, VERIFY_OTP_API, VERIFY_PHONE_OTP_API, LOGOUT_API } = authEndPoints;


// import { jwtDecode } from "jwt-decode"
// import { NavigateFunction } from "react-router-dom"


import { GenericApiResponse, SignupPayload, VerifyOtpPayload, LoginApiResponse, LoginPayload } from "@/lib/types/auth.types";
import { AppDispatch } from "@/redux/store";
import { getErrorMessage } from "@/lib/apiError";

// the signup endpoints can answer without a message, so say what each status means here.
// keep "too many" / "expired" in the OTP ones: RegistrationOtpStep matches them to offer a new code
const SIGNUP_ERRORS = {
    409: "An account with this email or phone number already exists. Log in instead, or sign up with different details.",
    429: "Too many code requests. Please wait a few minutes before trying again.",
};

const VERIFY_CODE_ERRORS = {
    400: "That code is incorrect. Check it and try again.",
    409: "This email, username or phone number was just registered by another account. Go back and sign up with different details.",
    410: "This code has expired.",
    429: "Too many incorrect attempts with this code.",
};


// export function sendSignupOtp(payload: SignupPayload) {
//     return async (dispatch: AppDispatch) => {
//         const toastId = toast.loading("Sending OTP...")
//         dispatch(setLoading(true))
//         try {
//             const response = await apiConnector<GenericApiResponse>({
//                 method: "POST",
//                 url: REGISTER_API,
//                 body: payload,
//             })

//             if (!response.data.success) {
//                 throw new Error(response.data.message)
//             }

//             dispatch(setSignupEmail(payload.email))
//             toast.success("OTP sent to your email")

//         } catch (error: any) {
//             console.log("SEND_SIGNUP_OTP ERROR............", error)
//             const message =
//                 error?.response?.data?.message || "Could not send OTP. Try again."
//             toast.error(message)
//         }
//         dispatch(setLoading(false))
//         toast.dismiss(toastId)
//     }
// }

export const sendSignupOtp = createAsyncThunk<
    GenericApiResponse,
    SignupPayload,
    { rejectValue: string }
>(
    "auth/sendSignupOtp",
    async (payload, { dispatch, rejectWithValue }) => {
        try {
            const response = await apiConnector<GenericApiResponse>({
                method: "POST",
                url: REGISTER_API,
                body: payload,
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not send OTP");
            }

            dispatch(setSignupEmail(payload.email));

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not send OTP. Try again.", SIGNUP_ERRORS));
        }
    }
);


export const verifySignupOtp = createAsyncThunk<
    GenericApiResponse,
    VerifyOtpPayload,
    { rejectValue: string }
>(
    "auth/verifySignupOtp",
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiConnector<GenericApiResponse>({
                method: "POST",
                url: VERIFY_OTP_API,
                body: payload,
            });

            if (!response.data.success) {
                return rejectWithValue(
                    response.data.message || "OTP verification failed"
                );
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not verify OTP. Try again.", VERIFY_CODE_ERRORS));
        }

    }
);


// runs after verifySignupOtp; this is the call that creates the account
export const verifySignupPhoneOtp = createAsyncThunk<
    GenericApiResponse,
    VerifyOtpPayload,
    { rejectValue: string }
>(
    "auth/verifySignupPhoneOtp",
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiConnector<GenericApiResponse>({
                method: "POST",
                url: VERIFY_PHONE_OTP_API,
                body: payload,
            });

            if (!response.data.success) {
                return rejectWithValue(
                    response.data.message || "OTP verification failed"
                );
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not verify OTP. Try again.", VERIFY_CODE_ERRORS));
        }
    }
);



export const loginUser = createAsyncThunk<
    LoginApiResponse,
    LoginPayload,
    { rejectValue: string }
>(
    "auth/loginUser",
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiConnector<LoginApiResponse>({
                method: "POST",
                url: LOGIN_API,
                body: payload,
            });

            if (!response.data.success) {
                return rejectWithValue(
                    response.data.message || "Login failed"
                );
            }

            return response.data;

        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Login failed. Please try again."));
        }
    }
);


export const logoutUser = createAsyncThunk("auth/logout", async () => {
    try {
        await apiConnector({ method: "POST", url: LOGOUT_API })
    } catch {

    }
})