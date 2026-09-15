import toast from "react-hot-toast";
import { authEndPoints } from "../api"
import { setSignupEmail } from "@/redux/slices/authSlice";
import { apiConnector } from "../apiConnector";

import { createAsyncThunk } from "@reduxjs/toolkit";
const { LOGIN_API, REGISTER_API, VERIFY_OTP_API } = authEndPoints;


// import { jwtDecode } from "jwt-decode"
// import { NavigateFunction } from "react-router-dom"


import { GenericApiResponse, SignupPayload, VerifyOtpPayload, LoginApiResponse, LoginPayload } from "@/lib/types/auth.types";
import { AppDispatch } from "@/redux/store";


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
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Could not send OTP. Try again.";

            return rejectWithValue(message);
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
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Could not send OTP. Try again.";

            return rejectWithValue(message);
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

        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Could not send OTP. Try again.";

            return rejectWithValue(message);
        }
    }
);