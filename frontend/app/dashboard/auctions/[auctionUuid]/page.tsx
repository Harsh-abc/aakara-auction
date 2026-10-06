"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, Pencil, Users } from "lucide-react";

import AuctionView from "@/components/core/Dashboard/auctions/AuctionView";
import AuctionStatusControl from "@/components/core/Dashboard/auctions/AuctionStatusControl";
import { buttonVariants } from "@/components/ui/button";
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus";
import { cn } from "@/lib/utils";

import type { Auction, AuctionLot, AuctionStatus } from "@/lib/types/auction.types";

import { getAuctions, getLotsByAuction } from "@/services/operations/auction.api";

import { AppDispatch, RootState } from "@/redux/store";

/** Mirrors the backend rule in updateAuctionService */
const EDITABLE_STATUSES: AuctionStatus[] = ["DRAFT", "SCHEDULED"];

export default function ViewAuction() {
    const { auctionUuid } = useParams<{ auctionUuid: string }>();
    const dispatch = useDispatch<AppDispatch>();

    const { auctions } = useSelector((state: RootState) => state.auction);
    const role = useSelector((state: RootState) => state.auth.role);
    const isSuperAdmin = role === "SUPER_ADMIN";
    // Admins can view registrations; only a super admin can change them (enforced by the API)
    const canSeeRegistrations = isSuperAdmin || role === "ADMIN";

    // Tagged with the uuid it was loaded for, so a different uuid reads as "loading"
    const [loaded, setLoaded] = useState<
        | { uuid: string; auction: Auction; lots: AuctionLot[]; error?: never }
        | { uuid: string; error: string; auction?: never; lots?: never }
        | null
    >(null);

    const auctionsRef = useRef(auctions);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                // Opened from the list -> already in the store; direct link / refresh -> fetch
                const findAuction = async (): Promise<Auction | undefined> => {
                    const cached = auctionsRef.current.find((a) => a.uuid === auctionUuid);
                    if (cached) return cached;
                    const res = await dispatch(getAuctions()).unwrap();
                    return res.data.find((a) => a.uuid === auctionUuid);
                };

                const [auction, lotsRes] = await Promise.all([
                    findAuction(),
                    dispatch(getLotsByAuction({ auctionUuid })).unwrap(),
                ]);
                if (cancelled) return;

                if (!auction) {
                    setLoaded({ uuid: auctionUuid, error: "Auction not found" });
                    return;
                }

                setLoaded({ uuid: auctionUuid, auction, lots: lotsRes.data.lots ?? [] });
            } catch (err) {
                if (!cancelled) {
                    setLoaded({
                        uuid: auctionUuid,
                        error: typeof err === "string" ? err : "Failed to load auction",
                    });
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [auctionUuid, dispatch]);

    // ---------------- states ----------------

    const current = loaded?.uuid === auctionUuid ? loaded : null;

    const backLink = (
        <Link
            href="/dashboard/auctions"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex gap-2")}
        >
            <ArrowLeft className="h-4 w-4" />
            Back to auctions
        </Link>
    );

    if (current?.error) {
        return (
            <div className="px-8 py-8">
                <div className="mb-4 flex items-start gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{current.error}</span>
                </div>
                {backLink}
            </div>
        );
    }

    if (!current?.auction) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading auction...
            </div>
        );
    }

    const { auction, lots } = current;
    const canEdit = EDITABLE_STATUSES.includes(auction.status);

    return (
        <div className="px-8 py-8">
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <Link
                        href="/dashboard/auctions"
                        className="mb-2 inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Auction Campaigns
                    </Link>
                    <h3 className="truncate text-2xl font-bold">{auction.title}</h3>
                </div>

                <div className="flex items-center gap-3">
                    {canSeeRegistrations && (
                        <Link
                            href={`/dashboard/auctions/${auction.uuid}/registrations`}
                            className={cn(buttonVariants({ variant: "outline" }), "flex items-center gap-2 px-4 text-[14px]")}
                        >
                            <Users className="h-4 w-4" />
                            Registrations
                        </Link>
                    )}

                    {isSuperAdmin && (
                        <AuctionStatusControl
                            auction={auction}
                            badge={
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-600">
                                    Status: <b className="text-slate-800">{AUCTION_STATUS_LABELS[auction.status]}</b>
                                </span>
                            }
                            onChanged={({ status, publishedAt, updatedAt }) =>
                                setLoaded((prev) =>
                                    prev?.auction
                                        ? { ...prev, auction: { ...prev.auction, status, publishedAt, updatedAt } }
                                        : prev
                                )
                            }
                        />
                    )}

                    {canEdit && (
                        <Link
                            href={`/dashboard/auctions/${auction.uuid}/edit`}
                            className={cn(
                                buttonVariants(),
                                "flex items-center gap-2 bg-dashboardButton px-4 text-[14px] hover:bg-amber-500"
                            )}
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Auction
                        </Link>
                    )}
                </div>
            </div>

            <AuctionView
                auction={auction}
                lots={lots}
                onLotDeleted={(lotUuid) =>
                    setLoaded((prev) => {
                        if (!prev?.auction) return prev;
                        const remaining = prev.lots.filter((lot) => lot.uuid !== lotUuid);
                        return {
                            ...prev,
                            lots: remaining,
                            auction: { ...prev.auction, _count: { ...prev.auction._count, items: remaining.length } },
                        };
                    })
                }
            />
        </div>
    );
}
