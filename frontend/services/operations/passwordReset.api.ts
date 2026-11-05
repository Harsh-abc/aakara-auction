import { authEndPoints } from "../api"
import { apiConnector } from "../apiConnector"

const { FORGOT_PASSWORD_API, VERIFY_RESET_OTP_API, RESET_PASSWORD_API } = authEndPoints

type MessageResponse = { success: boolean; message: string }
type VerifyResetOtpResponse = MessageResponse & { data: { resetToken: string } }

/** Emails a 6-digit reset code if the address has an account — the reply never says whether it does. */
export async function requestPasswordReset(email: string) {
    const { data } = await apiConnector<MessageResponse>({ method: "POST", url: FORGOT_PASSWORD_API, body: { email } })
    return data
}

/** Checks the emailed code; a right one comes back as a short-lived reset token. */
export async function verifyResetOtp(email: string, otp: string) {
    const { data } = await apiConnector<VerifyResetOtpResponse>({ method: "POST", url: VERIFY_RESET_OTP_API, body: { email, otp } })
    return data.data.resetToken
}

/** Sets a new password with the token from a verified code; the account is signed out everywhere. */
export async function resetPassword(token: string, password: string) {
    const { data } = await apiConnector<MessageResponse>({ method: "POST", url: RESET_PASSWORD_API, body: { token, password } })
    return data
}
