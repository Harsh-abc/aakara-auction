import {
    createSlice,
    PayloadAction,
} from "@reduxjs/toolkit";

import { createAuction } from "@/services/operations/auction.api";

interface AuctionState {
    loading: boolean;
    error: string | null;
    success: boolean;
    auction: any | null;
}

const initialState: AuctionState = {
    loading: false,
    error: null,
    success: false,
    auction: null,
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
            );
    },
});

export const {
    clearAuctionState,
} = auctionSlice.actions;

export default auctionSlice.reducer;