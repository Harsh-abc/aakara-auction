import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import { apiConnector } from "../apiConnector";
import { auctionEndPoints } from "../api";
import type {
    GetLotBiddersParams,
    GetLotBiddersResponse,
    GetLotSummaryResponse,
    VerifyLotBiddersParams,
    VerifyLotBiddersResponse,
} from "@/lib/types/lotBidder.types";
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
// GET LOT SUMMARY (top of the bidders page)
// =====================================================================

export const getLotSummary = createAsyncThunk<GetLotSummaryResponse, { lotUuid: string }, ThunkConfig>(
    "lotBidder/getLotSummary",
    async ({ lotUuid }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<GetLotSummaryResponse>({
                method: "GET",
                url: auctionEndPoints.GET_LOT_SUMMARY_API(lotUuid),
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to fetch lot"));
        }
    }
);

// =====================================================================
// GET LOT BIDDERS (users registered for the lot via its auction)
// =====================================================================

export const getLotBidders = createAsyncThunk<GetLotBiddersResponse, GetLotBiddersParams, ThunkConfig>(
    "lotBidder/getLotBidders",
    async ({ lotUuid, page, limit, search, filter }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<GetLotBiddersResponse>({
                method: "GET",
                url: auctionEndPoints.GET_LOT_BIDDERS_API(lotUuid),
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
            return rejectWithValue(toErrorMessage(error, "Failed to fetch lot bidders"));
        }
    }
);

// =====================================================================
// VERIFY / UNVERIFY LOT BIDDERS (SUPER_ADMIN only)
// =====================================================================

export const verifyLotBidders = createAsyncThunk<VerifyLotBiddersResponse, VerifyLotBiddersParams, ThunkConfig>(
    "lotBidder/verifyLotBidders",
    async ({ lotUuid, userUuids, verified }, { getState, rejectWithValue }) => {
        const token = getState().auth.accessToken;
        if (!token) return rejectWithValue("Authentication token not found");

        try {
            const response = await apiConnector<VerifyLotBiddersResponse>({
                method: "PATCH",
                url: auctionEndPoints.VERIFY_LOT_BIDDERS_API(lotUuid),
                body: { userUuids, verified },
                header: authHeader(token),
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(toErrorMessage(error, "Failed to update lot bidders"));
        }
    }
);
