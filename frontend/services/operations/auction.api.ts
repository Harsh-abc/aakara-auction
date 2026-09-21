import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import { apiConnector } from "../apiConnector";
import { auctionEndPoints } from "../api";
import { CreateAuctionResponse, GetAuctionsLotsParams, GetAuctionsParams, GetAuctionsResponse } from "@/lib/types/auction.types";
import { RootState } from "@/redux/store";

export const createAuction = createAsyncThunk<
    CreateAuctionResponse,
    FormData,
    {
        state: RootState;
        rejectValue: string;
    }
>(
    "auction/createAuction",

    async (formData, { getState, rejectWithValue }) => {
        try {
            const state = getState();

            const token = state.auth.accessToken;

            if (!token) {
                return rejectWithValue(
                    "Authentication token not found"
                );
            }

            const response =
                await apiConnector<CreateAuctionResponse>({
                    method: "POST",

                    url:
                        auctionEndPoints
                            .CREATE_AUCTION_API,

                    body: formData,

                    header: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                });

            return response.data;

        } catch (error) {

            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.message ||
                    "Failed to create auction"
                );
            }

            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : "Failed to create auction"
            );
        }
    }
);





export const getAuctions = createAsyncThunk<
    GetAuctionsResponse,
    GetAuctionsParams | undefined,
    {
        state: RootState;
        rejectValue: string;
    }
>(
    "auction/getAuctions",

    async (params, { getState, rejectWithValue }) => {
        try {
            const state = getState();

            const token = state.auth.accessToken;

            if (!token) {
                return rejectWithValue(
                    "Authentication token not found"
                );
            }

            const response =
                await apiConnector<GetAuctionsResponse>({
                    method: "GET",

                    url: auctionEndPoints.GET_AUCTION_API,

                    params: {
                        search: params?.search || undefined,
                        status: params?.status || undefined,
                        auctionType:
                            params?.auctionType || undefined,
                    },

                    header: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                });

            return response.data;

        } catch (error) {

            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.message ||
                    "Failed to fetch auctions"
                );
            }

            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : "Failed to fetch auctions"
            );
        }
    }
);

// export const getLotsByAuction = createAsyncThunk(
//     "auction/getLotsByAuction",
//     async (auctionUuid: string, { rejectWithValue }) => {
//         try {
//             const response = await apiConnector(
//                 method : "GET",
//                 url: auctionEndPoints.GET_LOTS_BY_AUCTION(auctionUuid)
//             );

//             return response.data;
//         } catch (error: any) {
//             return rejectWithValue(
//                 error.response?.data?.message ||
//                 "Failed to fetch lots"
//             );
//         }
//     }
// );


export const getLotsByAuction = createAsyncThunk<
    GetAuctionsResponse,
    GetAuctionsLotsParams,
    {
        state: RootState;
        rejectValue: string;
    }
>(
    "auction/getLotsByAuction",

    async (params, { getState, rejectWithValue }) => {
        try {
            const state = getState();

            const token = state.auth.accessToken;

            if (!token) {
                return rejectWithValue(
                    "Authentication token not found"
                );
            }

            // Extract auctionUuid from params
            const { auctionUuid } = params;

            if (!auctionUuid) {
                return rejectWithValue(
                    "Auction UUID is required"
                );
            }

            const response =
                await apiConnector<GetAuctionsResponse>({
                    method: "GET",

                    url: auctionEndPoints.GET_LOTS_BY_AUCTION(
                        auctionUuid
                    ),

                    header: {
                        Authorization: `Bearer ${token}`,
                    },
                });

            return response.data;

        } catch (error) {

            if (axios.isAxiosError(error)) {
                return rejectWithValue(
                    error.response?.data?.message ||
                    "Failed to fetch lots"
                );
            }

            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : "Failed to fetch lots"
            );
        }
    }
);