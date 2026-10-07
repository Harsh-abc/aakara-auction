import { apiConnector } from "../apiConnector"
import { profileEndpoints } from "../api"
import {
    ChangePasswordPayload,
    MyAccount,
    MyAuctionRegistration,
    MyKyc,
    UpdateProfilePayload,
    UserProfile,
} from "@/lib/types/profile.types"

const { GET_MY_PROFILE_API, UPDATE_MY_PROFILE_API, CHANGE_MY_PASSWORD_API, GET_MY_REGISTRATIONS_API, MY_KYC_API } =
    profileEndpoints

export async function getMyProfile(token: string | null): Promise<MyAccount> {
    const response = await apiConnector({
        method: "GET",
        url: GET_MY_PROFILE_API,
        header: { Authorization: `Bearer ${token}` },
    })
    return response.data.data
}

// FormData when uploading an avatar; a plain object otherwise
export async function updateMyProfile(
    body: FormData | UpdateProfilePayload,
    token: string | null
): Promise<UserProfile> {
    const response = await apiConnector({
        method: "PATCH",
        url: UPDATE_MY_PROFILE_API,
        body,
        header: { Authorization: `Bearer ${token}` },
    })
    return response.data.data
}

export async function changeMyPassword(payload: ChangePasswordPayload, token: string | null): Promise<void> {
    await apiConnector({
        method: "PATCH",
        url: CHANGE_MY_PASSWORD_API,
        body: payload,
        header: { Authorization: `Bearer ${token}` },
    })
}

export async function getMyRegistrations(token: string | null): Promise<MyAuctionRegistration[]> {
    const response = await apiConnector({
        method: "GET",
        url: GET_MY_REGISTRATIONS_API,
        header: { Authorization: `Bearer ${token}` },
    })
    return response.data.data
}

export async function getMyKyc(token: string | null): Promise<MyKyc | null> {
    const response = await apiConnector({
        method: "GET",
        url: MY_KYC_API,
        header: { Authorization: `Bearer ${token}` },
    })
    return response.data.data
}

// formData: kycType, documents (JSON [{ documentType }]) and a "document_<i>" file per entry
export async function submitMyKyc(formData: FormData, token: string | null): Promise<MyKyc> {
    const response = await apiConnector({
        method: "POST",
        url: MY_KYC_API,
        body: formData,
        header: { Authorization: `Bearer ${token}` },
    })
    return response.data.data
}
