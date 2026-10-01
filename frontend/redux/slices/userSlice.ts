import { createSlice } from "@reduxjs/toolkit";
import { changeUserRole, createUser, getAllUsers, getUserById, uploadUserKyc } from "@/services/operations/user.api";
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

    creatingUser: boolean;
    createUserError: string | null;

    // uuid of the user whose role is being changed
    changingRoleFor: string | null;
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

    creatingUser: false,
    createUserError: null,

    changingRoleFor: null,
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
            })

            .addCase(createUser.pending, (state) => {
                state.creatingUser = true;
                state.createUserError = null;
            })
            .addCase(createUser.fulfilled, (state) => {
                state.creatingUser = false;
            })
            .addCase(createUser.rejected, (state, action) => {
                state.creatingUser = false;
                state.createUserError = action.payload || "Something went wrong";
            })

            .addCase(changeUserRole.pending, (state, action) => {
                state.changingRoleFor = action.meta.arg.uuid;
            })
            .addCase(changeUserRole.fulfilled, (state, action) => {
                state.changingRoleFor = null;
                // update the row in place instead of refetching the list
                const { uuid, roleName } = action.payload.data;
                const user = state.users.find((u) => u.uuid === uuid);
                if (user) user.role = { name: roleName };
                if (state.selectedUser?.uuid === uuid) state.selectedUser.role = { name: roleName };
            })
            .addCase(changeUserRole.rejected, (state) => {
                state.changingRoleFor = null;
            });
    },
});

export default userSlice.reducer;