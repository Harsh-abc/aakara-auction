import toast from "react-hot-toast";
import { authEndPoints } from "../api"
import { setLoading, setSignupEmail } from "@/redux/slices/authSlice";
import { apiConnector } from "../apiConnector";


const { LOGIN_API, REGISTER_API, VERIFY_OTP_API } = authEndPoints;


// import { jwtDecode } from "jwt-decode"
import { NavigateFunction } from "react-router-dom"


import { GenericApiResponse, SignupPayload } from "@/lib/types/auth.types";
import { AppDispatch } from "@/redux/store";


export function sendSignupOtp(payload: SignupPayload, navigate: NavigateFunction) {
    return async (dispatch: AppDispatch) => {
        const toastId = toast.loading("Sending OTP...")
        dispatch(setLoading(true))
        try {
            const response = await apiConnector<GenericApiResponse>({
                method: "POST",
                url: REGISTER_API,
                body: payload,
            })

            if (!response.data.success) {
                throw new Error(response.data.message)
            }

            dispatch(setSignupEmail(payload.email))
            toast.success("OTP sent to your email")
            navigate("/verify-email")
        } catch (error: any) {
            console.log("SEND_SIGNUP_OTP ERROR............", error)
            const message =
                error?.response?.data?.message || "Could not send OTP. Try again."
            toast.error(message)
        }
        dispatch(setLoading(false))
        toast.dismiss(toastId)
    }
}

