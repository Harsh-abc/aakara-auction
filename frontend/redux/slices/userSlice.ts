import { createSlice } from "@reduxjs/toolkit";
import { changeUserRole, changeUserStatus, createUser, getAllUsers, getUserById, requestKycDocuments, reviewUserKyc, setKycStatus, updateUserDetails, uploadUserKyc } from "@/services/operations/user.api";
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

    // ids of the KYC documents whose review is being saved
    reviewingDocumentIds: string[];
    requestingKycDocuments: boolean;
    settingKycStatus: boolean;

    savingUserDetails: boolean;

    creatingUser: boolean;
    createUserError: string | null;

    // uuid of the user whose role is being changed
    changingRoleFor: string | null;

    // uuid of the user being suspended / reactivated
    changingStatusFor: string | null;
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

    reviewingDocumentIds: [],
    requestingKycDocuments: false,
    settingKycStatus: false,

    savingUserDetails: false,

    creatingUser: false,
    createUserError: null,

    changingRoleFor: null,

    changingStatusFor: null,
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
            .addCase(uploadUserKyc.fulfilled, (state, action) => {
                state.kycUploading = false;
                const updated = action.payload.data.user;
                if (state.selectedUser?.uuid === updated.uuid) state.selectedUser = updated;
                const row = state.users.find((u) => u.uuid === updated.uuid);
                if (row) row.kyc = updated.kyc;
            })
            .addCase(uploadUserKyc.rejected, (state, action) => {
                state.kycUploading = false;
                state.kycUploadError = action.payload || "Something went wrong";
            })

            .addCase(reviewUserKyc.pending, (state, action) => {
                state.reviewingDocumentIds = action.meta.arg.reviews.map((r) => r.documentId);
            })
            .addCase(reviewUserKyc.fulfilled, (state, action) => {
                state.reviewingDocumentIds = [];
                const updated = action.payload.data.user;
                if (state.selectedUser?.uuid === updated.uuid) state.selectedUser = updated;
                // keep the users table's KYC / role columns in step without refetching it
                const row = state.users.find((u) => u.uuid === updated.uuid);
                if (row) {
                    row.kyc = updated.kyc;
                    row.role = updated.role;
                }
            })
            .addCase(reviewUserKyc.rejected, (state) => {
                state.reviewingDocumentIds = [];
            })

            .addCase(requestKycDocuments.pending, (state) => {
                state.requestingKycDocuments = true;
            })
            .addCase(requestKycDocuments.fulfilled, (state, action) => {
                state.requestingKycDocuments = false;
                const updated = action.payload.data.user;
                if (state.selectedUser?.uuid === updated.uuid) state.selectedUser = updated;
                const row = state.users.find((u) => u.uuid === updated.uuid);
                if (row) row.kyc = updated.kyc;
            })
            .addCase(requestKycDocuments.rejected, (state) => {
                state.requestingKycDocuments = false;
            })

            .addCase(setKycStatus.pending, (state) => {
                state.settingKycStatus = true;
            })
            .addCase(setKycStatus.fulfilled, (state, action) => {
                state.settingKycStatus = false;
                const updated = action.payload.data.user;
                if (state.selectedUser?.uuid === updated.uuid) state.selectedUser = updated;
                const row = state.users.find((u) => u.uuid === updated.uuid);
                if (row) row.kyc = updated.kyc;
            })
            .addCase(setKycStatus.rejected, (state) => {
                state.settingKycStatus = false;
            })

            .addCase(updateUserDetails.pending, (state) => {
                state.savingUserDetails = true;
            })
            .addCase(updateUserDetails.fulfilled, (state, action) => {
                state.savingUserDetails = false;
                const updated = action.payload.data.user;
                if (state.selectedUser?.uuid === updated.uuid) state.selectedUser = updated;
                const row = state.users.find((u) => u.uuid === updated.uuid);
                if (row) {
                    row.username = updated.username;
                    row.profile = updated.profile;
                }
            })
            .addCase(updateUserDetails.rejected, (state) => {
                state.savingUserDetails = false;
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
                const { uuid, roleName, roleChangedAt, roleChangedBy } = action.payload.data;
                const user = state.users.find((u) => u.uuid === uuid);
                if (user) user.role = { name: roleName };
                if (state.selectedUser?.uuid === uuid) {
                    state.selectedUser.role = { name: roleName };
                    state.selectedUser.roleChangedAt = roleChangedAt;
                    state.selectedUser.roleChangedBy = roleChangedBy;
                }
            })
            .addCase(changeUserRole.rejected, (state) => {
                state.changingRoleFor = null;
            })

            .addCase(changeUserStatus.pending, (state, action) => {
                state.changingStatusFor = action.meta.arg.uuid;
            })
            .addCase(changeUserStatus.fulfilled, (state, action) => {
                state.changingStatusFor = null;
                const { uuid, status } = action.payload.data;
                const row = state.users.find((u) => u.uuid === uuid);
                if (row) row.status = status;
                if (state.selectedUser?.uuid === uuid) state.selectedUser.status = status;
            })
            .addCase(changeUserStatus.rejected, (state) => {
                state.changingStatusFor = null;
            });
    },
});

export default userSlice.reducer;