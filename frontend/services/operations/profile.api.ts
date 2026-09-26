import { apiConnector } from "../apiConnector"
import { profileEndpoints } from "../api"
import { MyAccount, UserProfile } from "@/lib/types/profile.types"

const { GET_MY_PROFILE_API, UPDATE_MY_PROFILE_API } = profileEndpoints

export async function getMyProfile(token: string | null): Promise<MyAccount> {
    const response = await apiConnector({
        method: "GET",
        url: GET_MY_PROFILE_API,
        header: { Authorization: `Bearer ${token}` },
    })
    return response.data.data
}

export async function updateMyProfile(formData: FormData, token: string | null): Promise<UserProfile> {
    const response = await apiConnector({
        method: "PATCH",
        url: UPDATE_MY_PROFILE_API,
        body: formData,
        header: { Authorization: `Bearer ${token}` },
    })
    return response.data.data
}