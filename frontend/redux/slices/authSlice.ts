import { AuthUser, AuthState } from "@/lib/types/auth.types"
import { createSlice, PayloadAction } from "@reduxjs/toolkit"


const initialState: AuthState = {
    loading: false,
    signupEmail: null,
    accessToken: null,
    user: null,
    role: null,
    permissions: [],
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload
        },
        setSignupEmail(state, action: PayloadAction<string | null>) {
            state.signupEmail = action.payload
        },
        setToken(state, action: PayloadAction<string | null>) {
            state.accessToken = action.payload
        },
        setUser(state, action: PayloadAction<AuthUser | null>) {
            state.user = action.payload
        },
        setRole(state, action: PayloadAction<string | null>) {
            state.role = action.payload
        },
        setPermissions(state, action: PayloadAction<string[]>) {
            state.permissions = action.payload
        },
        logout(state) {
            state.accessToken = null
            state.user = null
            state.role = null
            state.permissions = []
            state.signupEmail = null
        },
    },
})

export const {
    setLoading,
    setSignupEmail,
    setToken,
    setUser,
    setRole,
    setPermissions,
    logout,
} = authSlice.actions

export default authSlice.reducer