"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Plus, RefreshCw } from "lucide-react";

import { columns, AuctionTableMeta } from "@/components/core/Dashboard/auctions/AuctionsColumns";
import { AuctionStats } from "@/components/core/Dashboard/auctions/AuctionStats";
import { AuctionDataTable } from "@/components/core/Dashboard/auctions/AuctionDataTable";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AppDispatch, RootState } from "@/redux/store";
import { getAuctions } from "@/services/operations/auction.api";

export default function Auctions() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    // The list has its own flags; `loading` / `error` belong to create-auction
    const { auctions, auctionsLoading, auctionsError } = useSelector(
        (state: RootState) => state.auction
    );

    useEffect(() => {
        dispatch(getAuctions());
    }, [dispatch]);

    // Row actions used by the Actions column
    const tableMeta: AuctionTableMeta = {
        onView: (auction) => router.push(`/dashboard/auctions/${auction.uuid}`),
        onEdit: (auction) => router.push(`/dashboard/auctions/${auction.uuid}/edit`),
        onDelete: (auction) => {
            // TODO: wire to a DELETE endpoint (soft delete: sets deletedAt)
            console.log("Delete", auction.uuid);
        },
    };

    return (
        <div className="px-8 py-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Auction Campaigns</h3>

                {/* Link styled as a button (no <a> inside <button>) */}
                <Link
                    href="/dashboard/auctions/create-auctions"
                    className={cn(
                        buttonVariants(),
                        "flex items-center justify-center gap-2 px-3 py-4.5 text-[15px] bg-dashboardButton hover:bg-amber-500"
                    )}
                >
                    <Plus />
                    Create Auction
                </Link>
            </div>

            {/* Statistics */}
            <AuctionStats />

            {/* Error State */}
            {auctionsError && (
                <div className="my-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span>{auctionsError}</span>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => dispatch(getAuctions())}
                    >
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Auction Table (skeleton rows while loading) */}
            {!auctionsError && (
                <AuctionDataTable
                    columns={columns}
                    data={auctions}
                    loading={auctionsLoading && auctions.length === 0}
                    meta={tableMeta}
                />
            )}
        </div>
    );
}