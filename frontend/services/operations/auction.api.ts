import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

import { apiConnector } from "../apiConnector";
import { auctionEndPoints } from "../api";
import { CreateAuctionResponse } from "@/lib/types/auction.types";
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