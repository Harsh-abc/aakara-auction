"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, DownloadCloudIcon, Gavel, Radio, RefreshCw } from "lucide-react";

import DashboardFormText from "@/components/common/DashboardFormText";
import Carousel from "@/components/common/Carousel/Carousel";
import CarouselSlide from "@/components/common/Carousel/CarouselSlide";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import type { AuctionLot } from "@/lib/types/auction.types";
import type { LiveLotUpdate } from "@/lib/types/bidding.types";
import { applyLiveLotUpdate } from "@/redux/slices/auctionSlice";
import { getLiveAuctions, getLotsByAuction, setLotLive } from "@/services/operations/auction.api";

import LiveAuctionsCard from "./LiveAuctionsCard";
import { LiveAuctionDataTable } from "./LiveAuctionDataTable";
import LiveBiddingPanel from "./LiveBiddingPanel";
import type { LiveLotTableMeta } from "./LiveAuctionsColumns";

/** Roles that can start / stop lots (mirrors the PATCH /lots/:lotUuid/live route) */
const CONTROL_ROLES = ["SUPER_ADMIN", "ADMIN", "AUCTIONEER"];

export default function BiddingFloors() {
    const dispatch = useAppDispatch();
    const role = useAppSelector((state) => state.auth.role);
    const {
        liveAuctions,
        liveAuctionsLoading,
        liveAuctionsError,
        lots,
        lotsAuction,
        lotsLoading,
        lotsError,
        lotControlUuid,
    } = useAppSelector((state) => state.auction);

    // Auction whose lots are shown below — defaults to the first live one
    const [pickedUuid, setPickedUuid] = useState<string | null>(null);
    const selected = liveAuctions.find((a) => a.uuid === pickedUuid) ?? liveAuctions[0] ?? null;

    // Lot waiting for "Stop" confirmation
    const [pendingStop, setPendingStop] = useState<AuctionLot | null>(null);

    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dispatch(getLiveAuctions());
    }, [dispatch]);

    useEffect(() => {
        if (selected?.uuid) dispatch(getLotsByAuction({ auctionUuid: selected.uuid }));
    }, [dispatch, selected?.uuid]);

    // The server ends sales at their end time (checks every 30s) and closes their lots —
    // refetch just after the next one is due so it drops off the floor without a reload
    useEffect(() => {
        const now = Date.now();
        const nextEnd = liveAuctions
            .map((a) => new Date(a.endTime).getTime())
            .filter((t) => t > now)
            .sort((a, b) => a - b)[0];
        if (nextEnd === undefined) return;

        const delay = nextEnd - now + 35_000;
        if (delay > 24 * 60 * 60 * 1000) return; // far off — a normal reload will catch it

        const timer = setTimeout(() => {
            dispatch(getLiveAuctions());
            if (selected?.uuid) dispatch(getLotsByAuction({ auctionUuid: selected.uuid }));
        }, delay);
        return () => clearTimeout(timer);
    }, [liveAuctions, dispatch, selected?.uuid]);

    // The store's lots may still belong to the previously selected auction
    const showingSelected = Boolean(selected && lotsAuction?.uuid === selected.uuid);
    const tableLots = useMemo(() => (showingSelected ? lots : []), [showingSelected, lots]);

    const refresh = () => {
        dispatch(getLiveAuctions());
        if (selected?.uuid) dispatch(getLotsByAuction({ auctionUuid: selected.uuid }));
    };

    // Bids patch the lot row in place; a lot opening or closing (here or on another
    // screen) also changes the auction card, so the floor is refetched
    const onLiveLotUpdate = (update: LiveLotUpdate) => {
        const known = tableLots.find((lot) => lot.uuid === update.lotUuid);
        dispatch(applyLiveLotUpdate(update));
        if (known && known.status !== update.status) dispatch(getLiveAuctions());
    };

    const runControl = async (lot: AuctionLot, action: "start" | "stop") => {
        try {
            const res = await dispatch(setLotLive({ lotUuid: lot.uuid, action })).unwrap();
            toast.success(res.message);
            setPendingStop(null);
            dispatch(getLiveAuctions()); // card shows the new live lot
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not update the lot. Try again.");
            // someone else may have changed the floor — resync
            refresh();
        }
    };

    const liveLot = useMemo(() => {
        const active = tableLots.find((lot) => lot.status === "ACTIVE");
        return active ? { uuid: active.uuid, itemNumber: String(active.itemNumber) } : null;
    }, [tableLots]);

    const tableMeta: LiveLotTableMeta = {
        auctionStatus: selected?.status,
        canControl: Boolean(role && CONTROL_ROLES.includes(role)),
        liveLot,
        controllingUuid: lotControlUuid,
        onStart: (lot) => runControl(lot, "start"),
        onStop: (lot) => setPendingStop(lot),
    };

    const stopping = Boolean(pendingStop && lotControlUuid === pendingStop.uuid);

    return (
        <div className="my-9 mx-8">
            <div className="flex w-full items-center justify-between gap-4">
                <DashboardFormText text="Active Bidding Floors" className="text-[24px]" />

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="rounded-[8px] border-gray-300 bg-transparent text-black"
                        onClick={refresh}
                        disabled={liveAuctionsLoading}
                    >
                        <RefreshCw className={liveAuctionsLoading ? "animate-spin" : undefined} />
                        Refresh
                    </Button>
                    <Button variant="outline" className="rounded-[8px] border-gray-300 bg-transparent text-black">
                        <DownloadCloudIcon />
                        Export Live Report
                    </Button>
                </div>
            </div>

            {liveAuctionsError && (
                <div className="mt-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {liveAuctionsError}
                    </span>
                    <Button type="button" variant="outline" className="h-8 text-xs" onClick={refresh}>
                        Retry
                    </Button>
                </div>
            )}

            <div className="my-6 overflow-x-hidden">
                {liveAuctionsLoading && liveAuctions.length === 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {[0, 1].map((i) => (
                            <div key={i} className="h-60 animate-pulse rounded-xl bg-slate-100" />
                        ))}
                    </div>
                ) : liveAuctions.length > 0 ? (
                    <Carousel
                        className="w-full"
                        options={{ align: "start", loop: false }}
                        showButtons={liveAuctions.length > 2}
                        showDots={false}
                        autoplay={false}
                    >
                        {liveAuctions.map((auction) => (
                            <CarouselSlide
                                key={auction.uuid}
                                className="min-w-0 flex-[0_0_100%] pr-6 md:flex-[0_0_50%]"
                            >
                                <LiveAuctionsCard
                                    auction={auction}
                                    selected={auction.uuid === selected?.uuid}
                                    onManage={(a) => {
                                        setPickedUuid(a.uuid);
                                        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                />
                            </CarouselSlide>
                        ))}
                    </Carousel>
                ) : (
                    <div className="flex min-h-65 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-6 py-10 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                            <Gavel className="h-7 w-7 text-gray-500" strokeWidth={1.5} />
                        </div>

                        <h3 className="text-lg font-semibold text-[#414141]">No Live Auctions Right Now</h3>

                        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                            There are currently no auctions in progress. Set an auction&apos;s status to Live
                            from the Auction Campaigns page to run it here.
                        </p>

                        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                            <Radio className="h-3.5 w-3.5" />
                            <span>Live bidding is currently inactive</span>
                        </div>
                    </div>
                )}
            </div>

            {selected && (
                <div ref={tableRef} className="mt-8 scroll-mt-6 rounded-[8px] bg-[#F4F4F4]">
                    <div className="mx-6 flex flex-wrap items-end justify-between gap-2 pt-6">
                        <DashboardFormText text="Lot Management" className="text-[24px]" />
                        <p className="pb-4 text-[13px] text-slate-500">
                            {selected.title}
                            {selected.status !== "LIVE" && (
                                <span className="ml-2 rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                                    Auction is {selected.status.toLowerCase()} — lots can&apos;t be started
                                </span>
                            )}
                        </p>
                    </div>

                    {lotsError && !lotsLoading ? (
                        <div className="mx-3 mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{lotsError}</div>
                    ) : (
                        <LiveAuctionDataTable
                            data={tableLots}
                            loading={lotsLoading && tableLots.length === 0}
                            meta={tableMeta}
                        />
                    )}
                </div>
            )}

            {selected && (
                <LiveBiddingPanel
                    // fresh panel per sale, so its feed never mixes two auctions
                    key={selected.uuid}
                    auctionUuid={selected.uuid}
                    onLotUpdate={onLiveLotUpdate}
                    onAuctionStatus={refresh}
                />
            )}

            {/* Stop = close bidding on the lot */}
            <AlertDialog
                open={pendingStop !== null}
                onOpenChange={(open) => {
                    if (!open && !stopping) setPendingStop(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Stop Lot #{pendingStop?.itemNumber}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bidding on <b>{pendingStop?.title}</b> closes now. It&apos;s marked Sold if the top bid
                            meets the reserve, Passed if it doesn&apos;t, or Unsold if there were no bids. Unsold lots
                            can be started again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={stopping}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => pendingStop && runControl(pendingStop, "stop")}
                            disabled={stopping}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {stopping ? "Stopping..." : "Stop lot"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
