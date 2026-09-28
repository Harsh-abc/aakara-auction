import { createSlice } from "@reduxjs/toolkit";

import {
    createAuction,
    getAuctions,
    getLotsByAuction,
    deleteAuction,
    updateAuction
} from "@/services/operations/auction.api";
import type {
    Auction,
    AuctionLot,
    GetAuctionLotsResponse,
    DeleteAuctionResponse
} from "@/lib/types/auction.types";

/**
 * Each request has its own loading/error so that, for example, fetching the
 * auction list doesn't disable the "Publish" button or show a list error
 * inside the create form.
 *
 * `loading` / `error` / `success` are kept for CREATE so CreateAuctions.tsx
 * keeps working unchanged.
 */
interface AuctionState {
    // create
    loading: boolean;
    error: string | null;
    success: boolean;
    auction: Auction | null;

    // list
    auctions: Auction[];
    auctionsLoading: boolean;
    auctionsError: string | null;

    // lots of one auction
    lots: AuctionLot[];
    lotsAuction: GetAuctionLotsResponse["data"]["auction"] | null;
    lotsLoading: boolean;
    lotsError: string | null;

    deletingUuid: string | null;
    deleteError: string | null;

    // update
    updating: boolean;
    updateError: string | null;
    updateSuccess: boolean;

}

const initialState: AuctionState = {
    loading: false,
    error: null,
    success: false,
    auction: null,

    auctions: [],
    auctionsLoading: false,
    auctionsError: null,

    lots: [],
    lotsAuction: null,
    lotsLoading: false,
    lotsError: null,

    deletingUuid: null,
    deleteError: null,

    updating: false,
    updateError: null,
    updateSuccess: false,
};

const auctionSlice = createSlice({
    name: "auction",
    initialState,

    reducers: {
        /** Reset the create-form status (call on mount / after navigating away). */
        clearAuctionState: (state) => {
            state.loading = false;
            state.error = null;
            state.success = false;
            state.auction = null;
        },

        clearLots: (state) => {
            state.lots = [];
            state.lotsAuction = null;
            state.lotsError = null;
        },

        clearDeleteError: (state) => {
            state.deleteError = null;
        },

        clearUpdateState: (state) => {
            state.updating = false;
            state.updateError = null;
            state.updateSuccess = false;
        },

    },

    extraReducers: (builder) => {
        builder
            // ---------------- CREATE ----------------
            .addCase(createAuction.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createAuction.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.auction = action.payload.data;

                // Show the new auction at the top of the list without refetching
                if (action.payload.data) {
                    state.auctions = [
                        action.payload.data,
                        ...state.auctions.filter((a) => a.uuid !== action.payload.data.uuid),
                    ];
                }
            })
            .addCase(createAuction.rejected, (state, action) => {
                state.loading = false;
                state.success = false;
                state.error = action.payload ?? action.error.message ?? "Failed to create auction";
            })

            // ---------------- LIST ----------------
            .addCase(getAuctions.pending, (state) => {
                state.auctionsLoading = true;
                state.auctionsError = null;
            })
            .addCase(getAuctions.fulfilled, (state, action) => {
                state.auctionsLoading = false;
                state.auctions = action.payload.data ?? [];
            })
            .addCase(getAuctions.rejected, (state, action) => {
                state.auctionsLoading = false;
                state.auctionsError = action.payload ?? action.error.message ?? "Failed to fetch auctions";
            })

            // ---------------- LOTS ----------------
            .addCase(getLotsByAuction.pending, (state) => {
                state.lotsLoading = true;
                state.lotsError = null;
            })
            .addCase(getLotsByAuction.fulfilled, (state, action) => {
                state.lotsLoading = false;
                state.lots = action.payload.data.lots ?? [];
                state.lotsAuction = action.payload.data.auction ?? null;
            })
            .addCase(getLotsByAuction.rejected, (state, action) => {
                state.lotsLoading = false;
                state.lots = [];
                state.lotsError = action.payload ?? action.error.message ?? "Failed to fetch lots";
            })

            .addCase(deleteAuction.pending, (state, action) => {
                state.deletingUuid = action.meta.arg.auctionUuid;
                state.deleteError = null;
            })
            .addCase(deleteAuction.fulfilled, (state, action) => {
                const uuid = action.meta.arg.auctionUuid;
                state.deletingUuid = null;
                state.auctions = state.auctions.filter((a) => a.uuid !== uuid);
                if (state.lotsAuction?.uuid === uuid) {
                    state.lots = [];
                    state.lotsAuction = null;
                }
            })
            .addCase(deleteAuction.rejected, (state, action) => {
                state.deletingUuid = null;
                state.deleteError = action.payload ?? action.error.message ?? "Failed to delete auction";
            })

            // ---------------- UPDATE ----------------
            .addCase(updateAuction.pending, (state) => {
                state.updating = true;
                state.updateError = null;
                state.updateSuccess = false;
            })
            .addCase(updateAuction.fulfilled, (state, action) => {
                const updated = action.payload.data;
                state.updating = false;
                state.updateSuccess = true;
                state.auction = updated;

                // Replace it in the list without refetching
                if (updated) {
                    state.auctions = state.auctions.map((a) => (a.uuid === updated.uuid ? updated : a));
                }

                // Keep the lots view in sync if it's showing this auction
                if (updated && state.lotsAuction?.uuid === updated.uuid) {
                    state.lots = updated.items ?? state.lots;
                }
            })
            .addCase(updateAuction.rejected, (state, action) => {
                state.updating = false;
                state.updateSuccess = false;
                state.updateError = action.payload ?? action.error.message ?? "Failed to update auction";
            })
    },
});
export const { clearAuctionState, clearLots, clearDeleteError, clearUpdateState } = auctionSlice.actions;

export default auctionSlice.reducer;