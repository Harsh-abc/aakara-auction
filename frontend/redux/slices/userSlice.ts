import { createSlice } from "@reduxjs/toolkit";
import { getAllUsers, getUserById } from "@/services/operations/user.api";
import { User, Pagination } from "@/lib/types/user.types";

interface UserState {
    users: User[];
    pagination: Pagination | null;
    loading: boolean;
    error: string | null;
    selectedUser: User | null;
    selectedUserLoading: boolean;
    selectedUserError: string | null;
}

const initialState: UserState = {
    users: [],
    pagination: null,
    loading: false,
    error: null,
    selectedUser: null,
    selectedUserLoading: false,
    selectedUserError: null,
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
            });
    },
});

export default userSlice.reducer;