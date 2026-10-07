import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { adminEndPoints, userEndPoints } from "../api";
import { apiConnector } from "../apiConnector";
import { ChangeUserRolePayload, ChangeUserRoleResponse, CreateUserPayload, CreateUserResponse, GetAllUsersParams, GetAllUsersResponse, GetUserByIdResponse, RequestKycDocumentsPayload, RequestKycDocumentsResponse, ReviewUserKycPayload, ReviewUserKycResponse, UploadUserKycPayload, UploadUserKycResponse } from "@/lib/types/user.types";
import { RootState } from "@/redux/store";

const { GET_ALL_USERS_API, GET_USER_BY_ID_API, UPLOAD_USER_KYC_API, REVIEW_USER_KYC_API, REQUEST_KYC_DOCUMENTS_API } = userEndPoints;

const { CREATE_USER_API, CHANGE_USER_ROLE_API } = adminEndPoints;



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
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Could not fetch users. Try again.";

            return rejectWithValue(message);
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
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Could not fetch user. Try again.";

            return rejectWithValue(message);
        }
    }
);


export const uploadUserKyc = createAsyncThunk<
    UploadUserKycResponse,
    UploadUserKycPayload,
    { rejectValue: string; state: RootState }
>(
    "user/uploadUserKyc",
    async ({ uuid, kycType, documents }, { getState, dispatch, rejectWithValue }) => {
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

            // refresh user so the page switches to UserProfile
            dispatch(getUserById(uuid));

            return response.data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Could not upload KYC. Try again.";

            return rejectWithValue(message);
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
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : "Could not save the review. Try again.";

            return rejectWithValue(message);
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
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : "Could not send the request. Try again.";

            return rejectWithValue(message);
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
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Could not create user. Try again.";

            return rejectWithValue(message);
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
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Could not change role. Try again.";

            return rejectWithValue(message);
        }
    }
);
