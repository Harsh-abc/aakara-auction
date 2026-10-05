import { createSlice } from "@reduxjs/toolkit";

import { addNewLotBidder, getLotBidders, getLotSummary, verifyLotBidders } from "@/services/operations/lotBidder.api";
import type { GetLotBiddersResponse, LotBidder, LotSummary } from "@/lib/types/lotBidder.types";
import type { Pagination } from "@/lib/types/user.types";

/**
 * Lot details and the bidder list load separately, so the lot card still
 * shows when the list fails.
 */
interface LotBidderState {
    lot: LotSummary | null;
    lotLoading: boolean;
    lotError: string | null;

    bidders: LotBidder[];
    summary: GetLotBiddersResponse["data"]["summary"] | null;
    pagination: Pagination | null;
    loading: boolean;
    error: string | null;

    // user uuids currently being verified / unverified
    updatingUuids: string[];

    // "Add New Bidder" request in flight
    addingBidder: boolean;
}

const initialState: LotBidderState = {
    lot: null,
    lotLoading: false,
    lotError: null,

    bidders: [],
    summary: null,
    pagination: null,
    loading: false,
    error: null,

    updatingUuids: [],

    addingBidder: false,
};

const lotBidderSlice = createSlice({
    name: "lotBidder",
    initialState,

    reducers: {
        clearLotBidders: () => initialState,
    },

    extraReducers: (builder) => {
        builder
            // ---------------- LOT SUMMARY ----------------
            .addCase(getLotSummary.pending, (state, action) => {
                state.lotLoading = true;
                state.lotError = null;
                // a different lot -> don't flash the previous lot's data
                if (state.lot?.uuid !== action.meta.arg.lotUuid) {
                    Object.assign(state, initialState, { lotLoading: true });
                }
            })
            .addCase(getLotSummary.fulfilled, (state, action) => {
                state.lotLoading = false;
                state.lot = action.payload.data;
            })
            .addCase(getLotSummary.rejected, (state, action) => {
                state.lotLoading = false;
                state.lotError = action.payload ?? action.error.message ?? "Failed to fetch lot";
            })

            // ---------------- BIDDER LIST ----------------
            .addCase(getLotBidders.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getLotBidders.fulfilled, (state, action) => {
                const { bidders, summary, pagination } = action.payload.data;
                state.loading = false;
                state.bidders = bidders;
                state.summary = summary;
                state.pagination = pagination;
            })
            .addCase(getLotBidders.rejected, (state, action) => {
                state.loading = false;
                state.bidders = [];
                state.error = action.payload ?? action.error.message ?? "Failed to fetch lot bidders";
            })

            // the page refetches after a change, so only track what's in flight
            .addCase(addNewLotBidder.pending, (state) => {
                state.addingBidder = true;
            })
            .addCase(addNewLotBidder.fulfilled, (state) => {
                state.addingBidder = false;
            })
            .addCase(addNewLotBidder.rejected, (state) => {
                // error is shown by the dialog (toast)
                state.addingBidder = false;
            })

            .addCase(verifyLotBidders.pending, (state, action) => {
                state.updatingUuids = [...new Set([...state.updatingUuids, ...action.meta.arg.userUuids])];
            })
            .addCase(verifyLotBidders.fulfilled, (state, action) => {
                const done = new Set(action.meta.arg.userUuids);
                state.updatingUuids = state.updatingUuids.filter((uuid) => !done.has(uuid));
            })
            .addCase(verifyLotBidders.rejected, (state, action) => {
                const done = new Set(action.meta.arg.userUuids);
                state.updatingUuids = state.updatingUuids.filter((uuid) => !done.has(uuid));
            });
    },
});

export const { clearLotBidders } = lotBidderSlice.actions;

export default lotBidderSlice.reducer;
