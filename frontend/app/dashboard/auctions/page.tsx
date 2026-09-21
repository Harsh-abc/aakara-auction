"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { AuctionDataTable } from "@/components/core/Dashboard/auctions/AuctionDataTable";
import { columns } from "@/components/core/Dashboard/auctions/AuctionsColumns";
import { AuctionStats } from "@/components/core/Dashboard/auctions/AuctionStats";
import { Button } from "@/components/ui/button";

import { Plus } from "lucide-react";
import Link from "next/link";

import { AppDispatch, RootState } from "@/redux/store";
import { getAuctions } from "@/services/operations/auction.api";

export default function Auctions() {
    const dispatch = useDispatch<AppDispatch>();

    const {
        auctions,
        loading,
        error,
    } = useSelector(
        (state: RootState) => state.auction
    );

    useEffect(() => {
        dispatch(getAuctions());
    }, [dispatch]);

    return (
        <div className="px-8 py-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">
                    Auction Campaigns
                </h3>

                <div>
                    <Button
                        className="px-3 py-4.5 text-[15px] bg-dashboardButton hover:bg-amber-500"
                    >
                        <Link href="/dashboard/auctions/create-auctions" className="flex items-center justify-center gap-2">
                            <Plus />
                            Create Auction
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Statistics */}
            <AuctionStats />

            {/* Loading State */}
            {loading && (
                <div className="py-6 text-gray-500">
                    Loading auctions...
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="py-6 text-red-500">
                    {error}
                </div>
            )}

            {/* Auction Table */}
            {!loading && !error && (
                <AuctionDataTable
                    columns={columns}
                    data={auctions}
                />
            )}

        </div>
    );
}