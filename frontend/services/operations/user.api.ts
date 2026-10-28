import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/lib/apiError";
import { adminEndPoints, userEndPoints } from "../api";
import { apiConnector } from "../apiConnector";
import { ChangeUserRolePayload, ChangeUserRoleResponse, ChangeUserStatusPayload, ChangeUserStatusResponse, CreateUserPayload, CreateUserResponse, GetAllUsersParams, GetAllUsersResponse, GetUserByIdResponse, RequestKycDocumentsPayload, RequestKycDocumentsResponse, ReviewUserKycPayload, ReviewUserKycResponse, SetKycStatusPayload, SetKycStatusResponse, SetUserActivePayload, SetUserActiveResponse, UpdateUserDetailsPayload, UpdateUserDetailsResponse, UploadUserKycPayload, UploadUserKycResponse, UserStats } from "@/lib/types/user.types";
import { RootState } from "@/redux/store";

const { GET_ALL_USERS_API, GET_USER_STATS_API, GET_USER_BY_ID_API, UPLOAD_USER_KYC_API, REVIEW_USER_KYC_API, REQUEST_KYC_DOCUMENTS_API, SET_KYC_STATUS_API, SET_USER_ACTIVE_API, UPDATE_USER_DETAILS_API } = userEndPoints;

const { CREATE_USER_API, CHANGE_USER_ROLE_API, CHANGE_USER_STATUS_API } = adminEndPoints;

// counts for the users page cards — read straight from the database, not the loaded page of users
export async function getUserStats(token: string | null): Promise<UserStats> {
    const response = await apiConnector<{ success: boolean; message: string; data: UserStats }>({
        method: "GET",
        url: GET_USER_STATS_API,
        header: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
}



export const getAllUsers = createAsyncThunk<
    GetAllUsersResponse,
    GetAllUsersParams,
    { rejectValue: string; state: RootState }
>(
    "user/getAllUsers",
    async (params, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<GetAllUsersResponse>({
                method: "GET",
                url: GET_ALL_USERS_API,
                params,
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not fetch users");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not fetch users. Try again."));
        }
    }
);


export const getUserById = createAsyncThunk<
    GetUserByIdResponse,
    string,
    { rejectValue: string; state: RootState }
>(
    "user/getUserById",
    async (uuid, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<GetUserByIdResponse>({
                method: "GET",
                url: GET_USER_BY_ID_API(uuid),
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not fetch user");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not fetch user. Try again."));
        }
    }
);


export const uploadUserKyc = createAsyncThunk<
    UploadUserKycResponse,
    UploadUserKycPayload,
    { rejectValue: string; state: RootState }
>(
    "user/uploadUserKyc",
    async ({ uuid, kycType, documents }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const formData = new FormData();
            formData.append("kycType", kycType);
            formData.append(
                "documents",
                JSON.stringify(
                    documents.map((doc) => ({
                        documentType: doc.documentType,
                        documentNumber: doc.documentNumber || undefined,
                    }))
                )
            );
            documents.forEach((doc, i) => {
                formData.append(`document_${i}`, doc.file);
            });

            const response = await apiConnector<UploadUserKycResponse>({
                method: "POST",
                url: UPLOAD_USER_KYC_API(uuid),
                body: formData,
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not upload KYC");
            }

            // the response carries the refreshed user (the slice swaps it in, so the page doesn't reload)
            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not upload KYC. Try again."));
        }
    }
);

// approve / reject documents the user submitted; the response carries the refreshed user
export const reviewUserKyc = createAsyncThunk<
    ReviewUserKycResponse,
    ReviewUserKycPayload,
    { rejectValue: string; state: RootState }
>(
    "user/reviewUserKyc",
    async ({ uuid, reviews }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<ReviewUserKycResponse>({
                method: "PATCH",
                url: REVIEW_USER_KYC_API(uuid),
                body: { reviews },
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not save the review");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not save the review. Try again."));
        }
    }
);

// ask the user to upload specific KYC documents (emails them); the response carries the refreshed user
export const requestKycDocuments = createAsyncThunk<
    RequestKycDocumentsResponse,
    RequestKycDocumentsPayload,
    { rejectValue: string; state: RootState }
>(
    "user/requestKycDocuments",
    async ({ uuid, documentTypes, note }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<RequestKycDocumentsResponse>({
                method: "POST",
                url: REQUEST_KYC_DOCUMENTS_API(uuid),
                body: { documentTypes, note: note || undefined },
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not send the request");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not send the request. Try again."));
        }
    }
);

// staff marking KYC verified / not verified by hand; the response carries the refreshed user
export const setKycStatus = createAsyncThunk<
    SetKycStatusResponse,
    SetKycStatusPayload,
    { rejectValue: string; state: RootState }
>(
    "user/setKycStatus",
    async ({ uuid, verified, reason }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<SetKycStatusResponse>({
                method: "PATCH",
                url: SET_KYC_STATUS_API(uuid),
                body: { verified, reason: reason || undefined },
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not change the KYC status");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not change the KYC status. Try again."));
        }
    }
);

// staff editing name, date of birth and username; the response carries the refreshed user
export const updateUserDetails = createAsyncThunk<
    UpdateUserDetailsResponse,
    UpdateUserDetailsPayload,
    { rejectValue: string; state: RootState }
>(
    "user/updateUserDetails",
    async ({ uuid, ...details }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<UpdateUserDetailsResponse>({
                method: "PATCH",
                url: UPDATE_USER_DETAILS_API(uuid),
                body: details,
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not save the details");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not save the details. Try again."));
        }
    }
);

export const createUser = createAsyncThunk<
    CreateUserResponse,
    CreateUserPayload,
    { rejectValue: string; state: RootState }
>(
    "user/createUser",
    async (payload, { getState, dispatch, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<CreateUserResponse>({
                method: "POST",
                url: CREATE_USER_API,
                body: payload,
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not create user");
            }

            // refresh the users table with the new user
            dispatch(getAllUsers({ page: 1, limit: 100 }));

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not create user. Try again."));
        }
    }
);

export const changeUserRole = createAsyncThunk<
    ChangeUserRoleResponse,
    ChangeUserRolePayload,
    { rejectValue: string; state: RootState }
>(
    "user/changeUserRole",
    async ({ uuid, roleName }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<ChangeUserRoleResponse>({
                method: "PATCH",
                url: CHANGE_USER_ROLE_API(uuid),
                body: { roleName },
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not change role");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not change role. Try again."));
        }
    }
);

// active / inactive (inactive users can log in but can't register for auctions or bid)
export const setUserActive = createAsyncThunk<
    SetUserActiveResponse,
    SetUserActivePayload,
    { rejectValue: string; state: RootState }
>(
    "user/setUserActive",
    async ({ uuid, active }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<SetUserActiveResponse>({
                method: "PATCH",
                url: SET_USER_ACTIVE_API(uuid),
                body: { active },
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not update the account");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not update the account. Try again."));
        }
    }
);

// suspend (logs them out everywhere, blocks login) or reactivate — super admin only
export const changeUserStatus = createAsyncThunk<
    ChangeUserStatusResponse,
    ChangeUserStatusPayload,
    { rejectValue: string; state: RootState }
>(
    "user/changeUserStatus",
    async ({ uuid, action }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.accessToken;

            const response = await apiConnector<ChangeUserStatusResponse>({
                method: "PATCH",
                url: CHANGE_USER_STATUS_API(uuid),
                body: { action },
                header: { Authorization: `Bearer ${token}` },
            });

            if (!response.data.success) {
                return rejectWithValue(response.data.message || "Could not update the account");
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Could not update the account. Try again."));
        }
    }
);
