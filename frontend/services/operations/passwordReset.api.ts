import { authEndPoints } from "../api"
import { apiConnector } from "../apiConnector"

const { FORGOT_PASSWORD_API, RESET_PASSWORD_API } = authEndPoints

type MessageResponse = { success: boolean; message: string }

/** Emails a reset link if the address has an account — the reply never says whether it does. */
export async function requestPasswordReset(email: string) {
    const { data } = await apiConnector<MessageResponse>({ method: "POST", url: FORGOT_PASSWORD_API, body: { email } })
    return data
}

/** Sets a new password from the emailed link (token); the account is signed out everywhere. */
export async function resetPassword(token: string, password: string) {
    const { data } = await apiConnector<MessageResponse>({ method: "POST", url: RESET_PASSWORD_API, body: { token, password } })
    return data
}
