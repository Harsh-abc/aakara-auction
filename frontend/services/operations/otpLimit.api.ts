import { apiConnector } from "../apiConnector"
import { adminEndPoints } from "../api"
import type { OtpLimitKind, OtpLimitList } from "@/lib/types/otpLimit.types"

const { OTP_LIMITS_API, OTP_LIMIT_API } = adminEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

export async function getOtpLimits(token: string | null): Promise<OtpLimitList> {
    const response = await apiConnector({ method: "GET", url: OTP_LIMITS_API, header: authHeader(token) })
    return response.data.data
}

/** Resets one counter so the email / phone can get codes again; resolves to the server's message */
export async function resetOtpLimit(token: string | null, kind: OtpLimitKind, subject: string): Promise<string> {
    const response = await apiConnector({ method: "DELETE", url: OTP_LIMIT_API(kind, subject), header: authHeader(token) })
    return response.data.message
}

/** Resets every OTP counter; resolves to the server's message */
export async function resetAllOtpLimits(token: string | null): Promise<string> {
    const response = await apiConnector({ method: "DELETE", url: OTP_LIMITS_API, header: authHeader(token) })
    return response.data.message
}
