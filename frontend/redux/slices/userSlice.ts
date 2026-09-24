import { createSlice } from "@reduxjs/toolkit";
import { getAllUsers, getUserById, uploadUserKyc } from "@/services/operations/user.api";
import { User, Pagination } from "@/lib/types/user.types";

interface UserState {
    users: User[];
    pagination: Pagination | null;
    loading: boolean;
    error: string | null;
    selectedUser: User | null;
    selectedUserLoading: boolean;
    selectedUserError: string | null;

    kycUploading: boolean;
    kycUploadError: string | null;
}

const initialState: UserState = {
    users: [],
    pagination: null,
    loading: false,
    error: null,
    selectedUser: null,
    selectedUserLoading: false,
    selectedUserError: null,

    kycUploading: false,
    kycUploadError: null,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getAllUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAllUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.users = action.payload.data.users;
                state.pagination = action.payload.data.pagination;
            })
            .addCase(getAllUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Something went wrong";
            })

            .addCase(getUserById.pending, (state) => {
                state.selectedUserLoading = true;
                state.selectedUserError = null;
                state.selectedUser = null;
            })
            .addCase(getUserById.fulfilled, (state, action) => {
                state.selectedUserLoading = false;
                state.selectedUser = action.payload.data;
            })
            .addCase(getUserById.rejected, (state, action) => {
                state.selectedUserLoading = false;
                state.selectedUserError = action.payload || "Something went wrong";
            })

            .addCase(uploadUserKyc.pending, (state) => {
                state.kycUploading = true;
                state.kycUploadError = null;
            })
            .addCase(uploadUserKyc.fulfilled, (state) => {
                state.kycUploading = false;
            })
            .addCase(uploadUserKyc.rejected, (state, action) => {
                state.kycUploading = false;
                state.kycUploadError = action.payload || "Something went wrong";
            });
    },
});

export default userSlice.reducer;