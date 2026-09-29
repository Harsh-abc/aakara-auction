"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";

import AuctionsForm, {
    AuctionSubmitStatus,
    EMPTY_AUCTION_FORM,
} from "@/components/core/Dashboard/auctions/AuctionsForm";
import { AuctionFormData } from "@/lib/types/AuctionsFormData";

import { createAuction } from "@/services/operations/auction.api";
import { clearAuctionState } from "@/redux/slices/auctionSlice";
import { buildAuctionFormData } from "@/utils/buildAuctionFormData";

import { RootState, AppDispatch } from "@/redux/store";

export default function CreateAuctions() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();

    const { loading, error } = useSelector((state: RootState) => state.auction);

    // Clear stale success/error from a previous visit
    useEffect(() => {
        dispatch(clearAuctionState());
    }, [dispatch]);

    const handleSubmit = async (data: AuctionFormData, status: AuctionSubmitStatus) => {
        await dispatch(createAuction(buildAuctionFormData(data, status))).unwrap();
        router.push("/dashboard/auctions");
    };

    return (
        <AuctionsForm
            defaultValues={EMPTY_AUCTION_FORM}
            onSubmit={handleSubmit}
            submitting={loading}
            error={error}
            saveLabel="Save Draft"
            saveStatus="DRAFT"
            publishLabel="Publish"
        />
    );
}
