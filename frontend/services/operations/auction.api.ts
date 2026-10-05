import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import { apiConnector } from "../apiConnector";
import { auctionEndPoints } from "../api";
import {
    ChangeAuctionStatusParams,
    ChangeAuctionStatusResponse,
    CreateAuctionResponse,
    DeleteAuctionResponse,
    GetAuctionLotsResponse,
    GetAuctionsLotsParams,
    GetAuctionsParams,
    GetAuctionsResponse,
    GetAuctionTimelineParams,
    GetAuctionTimelineResponse,
    GetLiveAuctionsResponse,
    SetLotLiveParams,
    SetLotLiveResponse,
    UpdateAuctionParams,
    UpdateAuctionResponse,
} from "@/lib/types/auction.types";
import { RootState } from "@/redux/store";

type ThunkConfig = {
    state: RootState;
    rejectValue: string;
};

// =====================================================================
// HELPERS
// =====================================================================

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
// CREATE AUCTION (multipart/form-data)
// Don't set Content-Type yourself — axios adds the multipart boundary.
// =====================================================================

export const createAuction = createAsyncThunk<CreateAuctionResponse, FormData, ThunkConfig>(
    "auction/createAuction",
    async (formData, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<CreateAuctionResponse>({
                method: "POST",
                url: auctionEndPoints.CREATE_AUCTION_API,
                body: formData,
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to create auction"));
        }
    }
);

// =====================================================================
// GET AUCTIONS
// =====================================================================

export const getAuctions = createAsyncThunk<GetAuctionsResponse, GetAuctionsParams | undefined, ThunkConfig>(
    "auction/getAuctions",
    async (params, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<GetAuctionsResponse>({
                method: "GET",
                url: auctionEndPoints.GET_AUCTION_API,
                params: {
                    search: params?.search || undefined,
                    status: params?.status || undefined,
                    auctionType: params?.auctionType || undefined,
                    categoryUuid: params?.categoryUuid || undefined,
                    visibility: params?.visibility || undefined,
                },
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to fetch auctions"));
        }
    }
);

// =====================================================================
// GET LOTS BY AUCTION
// =====================================================================

export const getLotsByAuction = createAsyncThunk<GetAuctionLotsResponse, GetAuctionsLotsParams, ThunkConfig>(
    "auction/getLotsByAuction",
    async ({ auctionUuid }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");
        if (!auctionUuid) return rejectWithValue("Auction UUID is required");

        try {
            const response = await apiConnector<GetAuctionLotsResponse>({ // was GetAuctionsResponse
                method: "GET",
                url: auctionEndPoints.GET_LOTS_BY_AUCTION(auctionUuid),
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to fetch lots"));
        }
    }
);





export const deleteAuction = createAsyncThunk<DeleteAuctionResponse, { auctionUuid: string }, ThunkConfig>(
    "auction/deleteAuction",
    async ({ auctionUuid }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<DeleteAuctionResponse>({
                method: "DELETE",
                url: auctionEndPoints.DELETE_AUCTION_API(auctionUuid),
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to delete auction"));
        }
    }
);




export const updateAuction = createAsyncThunk<UpdateAuctionResponse, UpdateAuctionParams, ThunkConfig>(
    "auction/updateAuction",
    async ({ auctionUuid, formData }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");
        if (!auctionUuid) return rejectWithValue("Auction UUID is required");

        try {
            const response = await apiConnector<UpdateAuctionResponse>({
                method: "PUT",
                url: auctionEndPoints.UPDATE_AUCTION_API(auctionUuid),
                body: formData,
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to update auction"));
        }
    }
);

// =====================================================================
// CHANGE AUCTION STATUS (SUPER_ADMIN only)
// =====================================================================

export const changeAuctionStatus = createAsyncThunk<
    ChangeAuctionStatusResponse,
    ChangeAuctionStatusParams,
    ThunkConfig
>(
    "auction/changeAuctionStatus",
    async ({ auctionUuid, status, reason }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");
        if (!auctionUuid) return rejectWithValue("Auction UUID is required");

        try {
            const response = await apiConnector<ChangeAuctionStatusResponse>({
                method: "PATCH",
                url: auctionEndPoints.CHANGE_AUCTION_STATUS_API(auctionUuid),
                body: { status, reason: reason?.trim() || undefined },
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to change auction status"));
        }
    }
);
// =====================================================================
// LIVE FLOOR
// =====================================================================

/** LIVE + PAUSED auctions with floor stats */
export const getLiveAuctions = createAsyncThunk<GetLiveAuctionsResponse, void, ThunkConfig>(
    "auction/getLiveAuctions",
    async (_, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<GetLiveAuctionsResponse>({
                method: "GET",
                url: auctionEndPoints.GET_LIVE_AUCTIONS_API,
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to fetch live auctions"));
        }
    }
);

/** Start / stop a lot. Only one lot per auction can be live at a time. */
export const setLotLive = createAsyncThunk<SetLotLiveResponse, SetLotLiveParams, ThunkConfig>(
    "auction/setLotLive",
    async ({ lotUuid, action }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<SetLotLiveResponse>({
                method: "PATCH",
                url: auctionEndPoints.SET_LOT_LIVE_API(lotUuid),
                body: { action },
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to update the lot"));
        }
    }
);

// =====================================================================
// PAST / UPCOMING AUCTIONS
// =====================================================================

export const getAuctionTimeline = createAsyncThunk<GetAuctionTimelineResponse, GetAuctionTimelineParams, ThunkConfig>(
    "auction/getAuctionTimeline",
    async ({ type, page, limit, search }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<GetAuctionTimelineResponse>({
                method: "GET",
                url: auctionEndPoints.GET_AUCTION_TIMELINE_API,
                params: { type, page, limit, search: search?.trim() || undefined },
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, `Failed to fetch ${type} auctions`));
        }
    }
);
