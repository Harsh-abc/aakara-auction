import {
    createSlice,
    PayloadAction,
} from "@reduxjs/toolkit";

import { createAuction, getAuctions, getLotsByAuction } from "@/services/operations/auction.api";

interface AuctionState {
    loading: boolean;
    error: string | null;
    success: boolean;
    auction: any | null;
    auctions: any[];
    lots: any[];
}

const initialState: AuctionState = {
    loading: false,
    error: null,
    success: false,
    auction: null,
    auctions: [],
    lots: [],
};

const auctionSlice = createSlice({
    name: "auction",

    initialState,

    reducers: {
        clearAuctionState: (state) => {
            state.loading = false;
            state.error = null;
            state.success = false;
            state.auction = null;
        },
    },

    extraReducers: (builder) => {

        builder

            .addCase(
                createAuction.pending,
                (state) => {
                    state.loading = true;
                    state.error = null;
                    state.success = false;
                }
            )

            .addCase(
                createAuction.fulfilled,
                (state, action) => {
                    state.loading = false;
                    state.success = true;
                    state.auction =
                        action.payload.data;
                }
            )

            .addCase(
                createAuction.rejected,
                (state, action) => {
                    state.loading = false;
                    state.success = false;

                    state.error =
                        action.payload ||
                        "Failed to create auction";
                }
            )

            .addCase(
                getAuctions.pending,
                (state) => {
                    state.loading = true;
                    state.error = null;
                }
            )

            .addCase(
                getAuctions.fulfilled,
                (state, action) => {
                    state.loading = false;
                    state.auctions = action.payload.data;
                }
            )

            .addCase(
                getAuctions.rejected,
                (state, action) => {
                    state.loading = false;

                    state.error =
                        action.payload ||
                        "Failed to fetch auctions";
                }
            )

            .addCase(getLotsByAuction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })

            .addCase(getLotsByAuction.fulfilled, (state, action) => {
                state.loading = false;
                state.lots = action.payload.data;
            })

            .addCase(getLotsByAuction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch lots";
            });
    },
});

export const {
    clearAuctionState,
} = auctionSlice.actions;

export default auctionSlice.reducer;