"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle, Loader2, Plus, RefreshCw, X } from "lucide-react";

import { columns, AuctionTableMeta } from "@/components/core/Dashboard/auctions/AuctionsColumns";
import { AuctionStats } from "@/components/core/Dashboard/auctions/AuctionStats";
import { AuctionDataTable } from "@/components/core/Dashboard/auctions/AuctionDataTable";
import { Button, buttonVariants } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { Auction } from "@/lib/types/auction.types";
import { AppDispatch, RootState } from "@/redux/store";
import { deleteAuction, getAuctions } from "@/services/operations/auction.api";
import { clearDeleteError } from "@/redux/slices/auctionSlice"; // ⚠️ use YOUR slice path

export default function Auctions() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    const { auctions, auctionsLoading, auctionsError, deletingUuid, deleteError } = useSelector(
        (state: RootState) => state.auction
    );

    const [pendingDelete, setPendingDelete] = useState<Auction | null>(null); // auction in the dialog
    const [notice, setNotice] = useState<string | null>(null);                // success message

    useEffect(() => {
        dispatch(getAuctions());
    }, [dispatch]);

    const tableMeta: AuctionTableMeta = {
        onView: (auction) => router.push(`/dashboard/auctions/${auction.uuid}`),
        onEdit: (auction) => router.push(`/dashboard/auctions/${auction.uuid}/edit`),
        onDelete: (auction) => {
            dispatch(clearDeleteError());
            setPendingDelete(auction); // open confirm dialog
        },
        deletingUuid,
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            const result = await dispatch(
                deleteAuction({ auctionUuid: pendingDelete.uuid })
            ).unwrap();

            setPendingDelete(null);     // close dialog
            setNotice(result.message);  // show green message
        } catch {
            // error is shown inside the dialog via `deleteError`
        }
    };

    const isDeleting = Boolean(pendingDelete && deletingUuid === pendingDelete.uuid);
    const lotCount = pendingDelete?._count?.items ?? 0;

    return (
        <div className="px-8 py-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Auction Campaigns</h3>

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

            {/* Success message */}
            {notice && (
                <div className="my-4 flex items-center justify-between rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Load error */}
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

            {/* Table */}
            {!auctionsError && (
                <AuctionDataTable
                    columns={columns}
                    data={auctions}
                    loading={auctionsLoading && auctions.length === 0}
                    meta={tableMeta}
                />
            )}

            {/* Delete confirmation dialog */}
            <Dialog
                open={Boolean(pendingDelete)}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) setPendingDelete(null);
                }}
            >
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete draft auction?
                        </DialogTitle>
                        <DialogDescription>
                            This permanently deletes{" "}
                            <b className="text-slate-800">{pendingDelete?.title}</b>
                            {lotCount > 0 && (
                                <>
                                    {" "}and its{" "}
                                    <b className="text-slate-800">
                                        {lotCount} lot{lotCount === 1 ? "" : "s"}
                                    </b>
                                </>
                            )}
                            . This can&apos;t be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {deleteError && (
                        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                            {deleteError}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isDeleting}
                            onClick={() => setPendingDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={isDeleting}
                            onClick={confirmDelete}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete auction"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}