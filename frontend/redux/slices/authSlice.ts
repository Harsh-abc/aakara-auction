// import { AuthUser, AuthState } from "@/lib/types/auth.types"
// import { createSlice, PayloadAction } from "@reduxjs/toolkit"


// const initialState: AuthState = {
//     loading: false,
//     signupEmail: null,
//     accessToken: null,
//     user: null,
//     role: null,
//     permissions: [],
// }

// const authSlice = createSlice({
//     name: "auth",
//     initialState,
//     reducers: {
//         setLoading(state, action: PayloadAction<boolean>) {
//             state.loading = action.payload
//         },
//         setSignupEmail(state, action: PayloadAction<string | null>) {
//             state.signupEmail = action.payload
//         },
//         setToken(state, action: PayloadAction<string | null>) {
//             state.accessToken = action.payload
//         },
//         setUser(state, action: PayloadAction<AuthUser | null>) {
//             state.user = action.payload
//         },
//         setRole(state, action: PayloadAction<string | null>) {
//             state.role = action.payload
//         },
//         setPermissions(state, action: PayloadAction<string[]>) {
//             state.permissions = action.payload
//         },
//         logout(state) {
//             state.accessToken = null
//             state.user = null
//             state.role = null
//             state.permissions = []
//             state.signupEmail = null
//         },
//     },
// })

// export const {
//     setLoading,
//     setSignupEmail,
//     setToken,
//     setUser,
//     setRole,
//     setPermissions,
//     logout,
// } = authSlice.actions

// export default authSlice.reducer


import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import {
    AuthUser,
    AuthState,
} from "@/lib/types/auth.types";

import { loginUser, sendSignupOtp, verifySignupOtp } from "@/services/operations/auth.api";

const initialState: AuthState = {
    loading: false,
    signupEmail: null,
    accessToken: null,
    user: null,
    role: null,
    permissions: [],
};

const authSlice = createSlice({
    name: "auth",
    initialState,

    reducers: {
        setSignupEmail(
            state,
            action: PayloadAction<string | null>
        ) {
            state.signupEmail = action.payload;
        },

        setToken(
            state,
            action: PayloadAction<string | null>
        ) {
            state.accessToken = action.payload;
        },

        setUser(
            state,
            action: PayloadAction<AuthUser | null>
        ) {
            state.user = action.payload;
        },

        setRole(
            state,
            action: PayloadAction<string | null>
        ) {
            state.role = action.payload;
        },

        setPermissions(
            state,
            action: PayloadAction<string[]>
        ) {
            state.permissions = action.payload;
        },

        logout(state) {
            state.loading = false;
            state.accessToken = null;
            state.user = null;
            state.role = null;
            state.permissions = [];
            state.signupEmail = null;
        },
    },

    extraReducers: (builder) => {
        builder

            // ==========================================
            // SEND SIGNUP OTP
            // ==========================================

            .addCase(sendSignupOtp.pending, (state) => {
                state.loading = true;
            })

            .addCase(sendSignupOtp.fulfilled, (state, action) => {
                state.loading = false;
                state.signupEmail = action.meta.arg.email;
            })

            .addCase(sendSignupOtp.rejected, (state) => {
                state.loading = false;
            })

            // Verify signup OTP
            .addCase(verifySignupOtp.pending, (state) => {
                state.loading = true;
            })

            .addCase(verifySignupOtp.fulfilled, (state) => {
                state.loading = false;
            })

            .addCase(verifySignupOtp.rejected, (state) => {
                state.loading = false;
            })

            .addCase(loginUser.pending, (state) => {
                state.loading = true;
            })

            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;

                state.accessToken = action.payload.data.accessToken;
                state.user = action.payload.data.user;

                state.role = action.payload.data.role;
                state.permissions = action.payload.data.permissions;
            })

            .addCase(loginUser.rejected, (state) => {
                state.loading = false;
            })
    },
});

export const {
    setSignupEmail,
    setToken,
    setUser,
    setRole,
    setPermissions,
    logout,
} = authSlice.actions;

export default authSlice.reducer;
