import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import { apiConnector } from "../apiConnector";
import { auctionEndPoints } from "../api";
import type {
    AddNewParticipantParams,
    GetAuctionParticipantsParams,
    GetAuctionParticipantsResponse,
    GetParticipantCandidatesResponse,
    ParticipantActionResponse,
    ParticipantUuidsParams,
    VerifyParticipantsParams,
} from "@/lib/types/auctionParticipant.types";
import { RootState } from "@/redux/store";

type ThunkConfig = {
    state: RootState;
    rejectValue: string;
};

/** Pulls the backend's `message` out of any error shape. */
const toErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        if (!error.response) return "Cannot reach the server. Check your connection.";
        return (error.response.data as { message?: string })?.message || fallback;
    }
    return error instanceof Error ? error.message : fallback;
};

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

// =====================================================================
// GET AUCTION REGISTRATIONS
// =====================================================================

export const getAuctionParticipants = createAsyncThunk<
    GetAuctionParticipantsResponse,
    GetAuctionParticipantsParams,
    ThunkConfig
>("auctionParticipant/getAuctionParticipants", async ({ auctionUuid, page, limit, search, filter }, { getState, rejectWithValue }) => {
    const token = getState().auth.accessToken;
    if (!token) return rejectWithValue("Authentication token not found");

    try {
        const response = await apiConnector<GetAuctionParticipantsResponse>({
            method: "GET",
            url: auctionEndPoints.AUCTION_PARTICIPANTS_API(auctionUuid),
            params: {
                page,
                limit,
                search: search?.trim() || undefined,
                filter: filter && filter !== "all" ? filter : undefined,
            },
            header: authHeader(token),
        });
        return response.data;
    } catch (error) {
        return rejectWithValue(toErrorMessage(error, "Failed to fetch auction registrations"));
    }
});

// =====================================================================
// SEARCH USERS NOT YET REGISTERED (SUPER_ADMIN only)
// Results stay in the dialog, not the store
// =====================================================================

export const getParticipantCandidates = createAsyncThunk<
    GetParticipantCandidatesResponse,
    { auctionUuid: string; search?: string },
    ThunkConfig
>("auctionParticipant/getParticipantCandidates", async ({ auctionUuid, search }, { getState, rejectWithValue }) => {
    const token = getState().auth.accessToken;
    if (!token) return rejectWithValue("Authentication token not found");

    try {
        const response = await apiConnector<GetParticipantCandidatesResponse>({
            method: "GET",
            url: auctionEndPoints.PARTICIPANT_CANDIDATES_API(auctionUuid),
            params: { search: search?.trim() || undefined },
            header: authHeader(token),
        });
        return response.data;
    } catch (error) {
        return rejectWithValue(toErrorMessage(error, "Failed to fetch users"));
    }
});

// =====================================================================
// ADD EXISTING USERS (SUPER_ADMIN only)
// =====================================================================

export const addAuctionParticipants = createAsyncThunk<ParticipantActionResponse, ParticipantUuidsParams, ThunkConfig>(
    "auctionParticipant/addAuctionParticipants",
    async ({ auctionUuid, userUuids }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<ParticipantActionResponse>({
                method: "POST",
                url: auctionEndPoints.AUCTION_PARTICIPANTS_API(auctionUuid),
                body: { userUuids },
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to add users to auction"));
        }
    }
);

// =====================================================================
// CREATE A NEW USER AND REGISTER THEM (SUPER_ADMIN only)
// =====================================================================

export const addNewAuctionParticipant = createAsyncThunk<ParticipantActionResponse, AddNewParticipantParams, ThunkConfig>(
    "auctionParticipant/addNewAuctionParticipant",
    async ({ auctionUuid, ...user }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<ParticipantActionResponse>({
                method: "POST",
                url: auctionEndPoints.ADD_NEW_PARTICIPANT_API(auctionUuid),
                body: user,
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to add user to auction"));
        }
    }
);

// =====================================================================
// VERIFY / UNVERIFY ON ALL OPEN LOTS (SUPER_ADMIN only)
// =====================================================================

export const verifyAuctionParticipants = createAsyncThunk<
    ParticipantActionResponse,
    VerifyParticipantsParams,
    ThunkConfig
>("auctionParticipant/verifyAuctionParticipants", async ({ auctionUuid, userUuids, verified }, { getState, rejectWithValue }) => {
    const token = getState().auth.accessToken;
    if (!token) return rejectWithValue("Authentication token not found");

    try {
        const response = await apiConnector<ParticipantActionResponse>({
            method: "PATCH",
            url: auctionEndPoints.VERIFY_PARTICIPANTS_API(auctionUuid),
            body: { userUuids, verified },
            header: authHeader(token),
        });
        return response.data;
    } catch (error) {
        return rejectWithValue(toErrorMessage(error, "Failed to update registrations"));
    }
});

// =====================================================================
// REMOVE FROM THE AUCTION (SUPER_ADMIN only)
// =====================================================================

export const removeAuctionParticipants = createAsyncThunk<ParticipantActionResponse, ParticipantUuidsParams, ThunkConfig>(
    "auctionParticipant/removeAuctionParticipants",
    async ({ auctionUuid, userUuids }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<ParticipantActionResponse>({
                method: "DELETE",
                url: auctionEndPoints.AUCTION_PARTICIPANTS_API(auctionUuid),
                body: { userUuids },
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to remove users from auction"));
        }
    }
);
