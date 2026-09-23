import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import { apiConnector } from "../apiConnector";
import { auctionEndPoints } from "../api";
import {
    CreateAuctionResponse,
    DeleteAuctionResponse,
    GetAuctionLotsResponse,
    GetAuctionsLotsParams,
    GetAuctionsParams,
    GetAuctionsResponse,
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