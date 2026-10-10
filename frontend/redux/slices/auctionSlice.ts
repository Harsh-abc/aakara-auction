import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import {
    changeAuctionStatus,
    createAuction,
    getAuctions,
    getAuctionTimeline,
    getLiveAuctions,
    setLotLive,
    getLotsByAuction,
    deleteAuction,
    updateAuction
} from "@/services/operations/auction.api";
import type {
    Auction,
    AuctionLot,
    AuctionTimelineType,
    GetAuctionLotsResponse,
    GetAuctionTimelineResponse,
    LiveAuctionSummary,
    DeleteAuctionResponse
} from "@/lib/types/auction.types";
import type { LiveLotUpdate } from "@/lib/types/bidding.types";

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

    // uuid of the auction whose status is being changed
    changingStatusUuid: string | null;

    // live floor
    liveAuctions: LiveAuctionSummary[];
    liveAuctionsLoading: boolean;
    liveAuctionsError: string | null;

    // uuid of the lot being started / stopped
    lotControlUuid: string | null;

    // past / upcoming pages (tagged with the type so pages don't show each other's data)
    timeline: (GetAuctionTimelineResponse["data"] & { type: AuctionTimelineType }) | null;
    timelineLoading: boolean;
    timelineError: string | null;
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

    changingStatusUuid: null,

    liveAuctions: [],
    liveAuctionsLoading: false,
    liveAuctionsError: null,

    lotControlUuid: null,

    timeline: null,
    timelineLoading: false,
    timelineError: null,
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

        /** A live bid / lot change from the socket — patch the lot row in place. */
        applyLiveLotUpdate: (state, action: PayloadAction<LiveLotUpdate>) => {
            const update = action.payload;
            if (state.lotsAuction?.uuid !== update.auctionUuid) return;
            const lot = state.lots.find((row) => row.uuid === update.lotUuid);
            if (!lot) return;
            lot.status = update.status;
            if (update.currentBid !== undefined) lot.currentBid = update.currentBid;
            if (update.bidCount !== undefined) lot.bidCount = update.bidCount;
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

                // Replace it in the list without refetching. The response has no
                // creator/_count, so merge over the list row and recount lots.
                if (updated) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { items, ...auctionOnly } = updated;
                    state.auctions = state.auctions.map((a) =>
                        a.uuid === updated.uuid
                            ? { ...a, ...auctionOnly, _count: { items: items?.length ?? a._count?.items ?? 0 } }
                            : a
                    );
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

            // ---------------- CHANGE STATUS ----------------
            .addCase(changeAuctionStatus.pending, (state, action) => {
                state.changingStatusUuid = action.meta.arg.auctionUuid;
            })
            .addCase(changeAuctionStatus.fulfilled, (state, action) => {
                const { uuid, status, publishedAt, updatedAt } = action.payload.data;
                state.changingStatusUuid = null;

                // Update the list row in place (edit / delete buttons follow the status)
                state.auctions = state.auctions.map((a) =>
                    a.uuid === uuid ? { ...a, status, publishedAt, updatedAt } : a
                );
                if (state.lotsAuction?.uuid === uuid) state.lotsAuction.status = status;
            })
            .addCase(changeAuctionStatus.rejected, (state) => {
                // error is shown by the caller (toast)
                state.changingStatusUuid = null;
            })

            // ---------------- LIVE FLOOR ----------------
            .addCase(getLiveAuctions.pending, (state) => {
                state.liveAuctionsLoading = true;
                state.liveAuctionsError = null;
            })
            .addCase(getLiveAuctions.fulfilled, (state, action) => {
                state.liveAuctionsLoading = false;
                state.liveAuctions = action.payload.data ?? [];
            })
            .addCase(getLiveAuctions.rejected, (state, action) => {
                state.liveAuctionsLoading = false;
                state.liveAuctionsError = action.payload ?? action.error.message ?? "Failed to fetch live auctions";
            })

            .addCase(setLotLive.pending, (state, action) => {
                state.lotControlUuid = action.meta.arg.lotUuid;
            })
            .addCase(setLotLive.fulfilled, (state, action) => {
                const { uuid, status, currentBid, bidCount } = action.payload.data;
                state.lotControlUuid = null;
                // update the lot row in place (the page refetches floor stats)
                state.lots = state.lots.map((lot) =>
                    lot.uuid === uuid ? { ...lot, status, currentBid, bidCount } : lot
                );
            })
            .addCase(setLotLive.rejected, (state) => {
                // error is shown by the caller (toast)
                state.lotControlUuid = null;
            })

            // ---------------- PAST / UPCOMING ----------------
            .addCase(getAuctionTimeline.pending, (state, action) => {
                state.timelineLoading = true;
                state.timelineError = null;
                if (state.timeline?.type !== action.meta.arg.type) state.timeline = null;
            })
            .addCase(getAuctionTimeline.fulfilled, (state, action) => {
                state.timelineLoading = false;
                state.timeline = { ...action.payload.data, type: action.meta.arg.type };
            })
            .addCase(getAuctionTimeline.rejected, (state, action) => {
                state.timelineLoading = false;
                state.timelineError = action.payload ?? action.error.message ?? "Failed to fetch auctions";
            })
    },
});
export const { clearAuctionState, clearLots, clearDeleteError, clearUpdateState, applyLiveLotUpdate } = auctionSlice.actions;

export default auctionSlice.reducer;