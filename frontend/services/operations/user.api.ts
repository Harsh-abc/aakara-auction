import { createAsyncThunk } from "@reduxjs/toolkit";
import { userEndPoints } from "../api";
import { apiConnector } from "../apiConnector";
import { GetAllUsersParams, GetAllUsersResponse, GetUserByIdResponse } from "@/lib/types/user.types";
import { RootState } from "@/redux/store";

const { GET_ALL_USERS_API, GET_USER_BY_ID_API } = userEndPoints;



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