import { createSlice, isAnyOf } from "@reduxjs/toolkit";

import {
    addAuctionParticipants,
    addNewAuctionParticipant,
    getAuctionParticipants,
    removeAuctionParticipants,
    verifyAuctionParticipants,
} from "@/services/operations/auctionParticipant.api";
import type { GetAuctionParticipantsResponse } from "@/lib/types/auctionParticipant.types";

type Data = GetAuctionParticipantsResponse["data"];

interface AuctionParticipantState {
    auctionUuid: string | null;
    auction: Data["auction"] | null;
    lots: Data["lots"];
    participants: Data["participants"];
    summary: Data["summary"] | null;
    pagination: Data["pagination"] | null;
    loading: boolean;
    error: string | null;

    // user uuids with a verify / remove request in flight
    updatingUuids: string[];

    // "Add Existing User" / "Add New Bidder" request in flight
    adding: boolean;
}

const initialState: AuctionParticipantState = {
    auctionUuid: null,
    auction: null,
    lots: [],
    participants: [],
    summary: null,
    pagination: null,
    loading: false,
    error: null,

    updatingUuids: [],

    adding: false,
};

const auctionParticipantSlice = createSlice({
    name: "auctionParticipant",
    initialState,

    reducers: {
        clearAuctionParticipants: () => initialState,
    },

    extraReducers: (builder) => {
        builder
            .addCase(getAuctionParticipants.pending, (state, action) => {
                // a different auction -> don't flash the previous auction's data
                if (state.auctionUuid !== action.meta.arg.auctionUuid) {
                    Object.assign(state, initialState, { auctionUuid: action.meta.arg.auctionUuid });
                }
                state.loading = true;
                state.error = null;
            })
            .addCase(getAuctionParticipants.fulfilled, (state, action) => {
                const { auction, lots, participants, summary, pagination } = action.payload.data;
                state.loading = false;
                state.auction = auction;
                state.lots = lots;
                state.participants = participants;
                state.summary = summary;
                state.pagination = pagination;
            })
            .addCase(getAuctionParticipants.rejected, (state, action) => {
                state.loading = false;
                state.participants = [];
                state.error = action.payload ?? action.error.message ?? "Failed to fetch auction registrations";
            })

            // the page refetches after a change, so only track what's in flight
            .addMatcher(isAnyOf(addAuctionParticipants.pending, addNewAuctionParticipant.pending), (state) => {
                state.adding = true;
            })
            .addMatcher(
                isAnyOf(
                    addAuctionParticipants.fulfilled,
                    addAuctionParticipants.rejected,
                    addNewAuctionParticipant.fulfilled,
                    addNewAuctionParticipant.rejected
                ),
                (state) => {
                    // errors are shown by the dialogs (toast)
                    state.adding = false;
                }
            )

            .addMatcher(isAnyOf(verifyAuctionParticipants.pending, removeAuctionParticipants.pending), (state, action) => {
                state.updatingUuids = [...new Set([...state.updatingUuids, ...action.meta.arg.userUuids])];
            })
            .addMatcher(
                isAnyOf(
                    verifyAuctionParticipants.fulfilled,
                    verifyAuctionParticipants.rejected,
                    removeAuctionParticipants.fulfilled,
                    removeAuctionParticipants.rejected
                ),
                (state, action) => {
                    const done = new Set(action.meta.arg.userUuids);
                    state.updatingUuids = state.updatingUuids.filter((uuid) => !done.has(uuid));
                }
            );
    },
});

export const { clearAuctionParticipants } = auctionParticipantSlice.actions;

export default auctionParticipantSlice.reducer;
