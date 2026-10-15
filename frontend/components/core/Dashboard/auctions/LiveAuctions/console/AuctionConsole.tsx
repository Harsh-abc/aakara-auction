"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertTriangle, ChevronRight, Gavel, ImageOff, Loader2, PauseCircle, Play, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuctionChannel } from "@/hooks/useAuctionChannel";
import { getErrorMessage } from "@/lib/apiError";
import { canControlLots } from "@/lib/constants/roles";
import type { AuctionConsole as ConsoleData, ConsoleLot, ConsolePosition, HammerResult, StaffBid } from "@/lib/types/bidding.types";
import { cn } from "@/lib/utils";
import { setLotLive } from "@/services/operations/auction.api";
import { getAuctionConsole, hammerLot, placeFloorBid } from "@/services/operations/bidding.api";

import FloorBidDialog from "./FloorBidDialog";
import HammerDialog from "./HammerDialog";
import { compactMoney, money, paddleLabel, sourceBadge } from "./consoleDisplay";

/** Bids kept in the log (the server sends the latest 100) */
const LOG_LIMIT = 100;
/** Refetched on this beat as well as on socket events (reserve, paddles, a missed event) */
const RESYNC_MS = 30_000;

/** Auctions the console runs (lots only go live on these) */
const FLOOR_STATUSES = ["LIVE", "PAUSED"];

// The auctioneer's view of one sale: the live lot, the current ask, the next
// increments, and the bid log — floor bids and the hammer for those who run the floor
export default function AuctionConsole({ auctionUuid }: { auctionUuid: string }) {
    const dispatch = useAppDispatch();
    const token = useAppSelector((state) => state.auth.accessToken);
    const canControl = canControlLots(useAppSelector((state) => state.auth.role));
    const lotControlUuid = useAppSelector((state) => state.auction.lotControlUuid);

    const [data, setData] = useState<ConsoleData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reload, setReload] = useState(0);
    const refetch = useCallback(() => setReload((n) => n + 1), []);

    // socket handlers compare against the latest data without re-subscribing
    const dataRef = useRef<ConsoleData | null>(null);
    useEffect(() => {
        dataRef.current = data;
    });

    const [picked, setPicked] = useState<string | null>(null);
    const [floorOpen, setFloorOpen] = useState(false);
    const [hammerOpen, setHammerOpen] = useState(false);
    const [busy, setBusy] = useState<"floor" | "hammer" | null>(null);
    const [lastSale, setLastSale] = useState<HammerResult | null>(null);

    useEffect(() => {
        let cancelled = false;
        getAuctionConsole(auctionUuid, token)
            .then((next) => {
                if (cancelled) return;
                // a bid pushed over the socket may be newer than this read
                setData((prev) => (isBehind(next, prev) ? prev : next));
                setError(null);
            })
            .catch((err) => {
                if (!cancelled) setError(getErrorMessage(err, "Couldn't load the bidding console"));
            });
        return () => {
            cancelled = true;
        };
    }, [auctionUuid, token, reload]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") refetch();
        }, RESYNC_MS);
        return () => window.clearInterval(timer);
    }, [refetch]);

    const connected = useAuctionChannel(
        auctionUuid,
        {
            onStaffBid: (event) => {
                // a bid on a lot the console isn't showing: a lot was started from another screen
                if (dataRef.current?.lot?.uuid !== event.lotUuid) return refetch();
                setData((prev) => (prev ? applyBids(prev, event.lotUuid, event) : prev));
            },
            onLotUpdate: (update) => {
                // bids on the live lot arrive as bid:new; anything else (a lot opening or closing) reloads
                const lot = dataRef.current?.lot;
                if (update.lotUuid !== lot?.uuid || update.status !== lot?.status) refetch();
            },
            onAuctionStatus: refetch,
            onReconnect: refetch,
        },
        { staff: true }
    );

    // ---------------- actions ----------------

    const lot = data?.lot ?? null;
    const position = data?.position ?? null;

    const submitFloorBid = async (paddleNumber: string, amount: number) => {
        if (!lot) return;
        setBusy("floor");
        try {
            const res = await placeFloorBid(lot.uuid, paddleNumber, amount, token);
            toast.success(res.message);
            setFloorOpen(false);
            if (!connected) refetch(); // the socket normally brings the bid in
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't place the floor bid"));
            refetch();
        } finally {
            setBusy(null);
        }
    };

    const confirmHammer = async (bidCount: number) => {
        if (!lot) return;
        setBusy("hammer");
        try {
            const res = await hammerLot(lot.uuid, bidCount, token);
            toast.success(res.message);
            setLastSale(res.data);
            setHammerOpen(false);
        } catch (err) {
            // e.g. a bid landed while confirming — the dialog stays open on the new figures
            toast.error(getErrorMessage(err, "Couldn't sell the lot"));
        } finally {
            setBusy(null);
            refetch();
        }
    };

    const startLot = async (lotUuid: string) => {
        try {
            const res = await dispatch(setLotLive({ lotUuid, action: "start" })).unwrap();
            toast.success(res.message);
            setLastSale(null);
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Could not start the lot. Try again.");
        } finally {
            refetch();
        }
    };

    // ---------------- states ----------------

    if (!data) {
        return (
            <ConsoleFrame title={null}>
                {error ? (
                    <div className="mt-6 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
                        <span className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {error}
                        </span>
                        <Button type="button" variant="outline" className="h-8 text-xs" onClick={refetch}>
                            Retry
                        </Button>
                    </div>
                ) : (
                    <ConsoleSkeleton />
                )}
            </ConsoleFrame>
        );
    }

    const { auction } = data;
    const code = lot?.currency.code ?? auction.currency.code;
    const onFloor = FLOOR_STATUSES.includes(auction.status);
    const paused = auction.status === "PAUSED";
    // online-only sales take no bids from the room
    const takesFloorBids = auction.auctionType !== "LIVE";

    const options = position?.bidOptions ?? [];
    const selectedAmount = picked && options.includes(picked) ? picked : options[0] ?? null;
    const hasBids = Number(position?.bidCount ?? 0) > 0;

    return (
        <ConsoleFrame title={auction.title} status={auction.status} lots={`${auction.closedLots} / ${auction.lotCount} lots closed`}>
            {error && (
                <div className="mt-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-2 text-[13px] text-red-600">
                    <span>{error}</span>
                    <Button type="button" variant="outline" className="h-7 text-xs" onClick={refetch}>
                        <RefreshCw className="h-3 w-3" />
                        Retry
                    </Button>
                </div>
            )}

            {paused && (
                <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
                    <PauseCircle className="h-4 w-4" />
                    Bidding is paused for this auction. Resume it from Auction Campaigns to take bids again.
                </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* left: lot, current ask, increments, actions */}
                <div className="flex min-w-0 flex-col lg:min-h-160">
                    {lastSale && <SoldBanner sale={lastSale} />}

                    {lot && position ? (
                        <>
                            <LotCard lot={lot} />

                            <CurrentAsk position={position} code={code} />

                            <div className="min-h-6 flex-1" />

                            <p className="text-[12px] font-semibold text-[#414141]">Quick Increment Triggers</p>
                            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {(options.length ? options : [null, null, null]).map((option, index) => {
                                    const selectable = Boolean(option) && takesFloorBids && canControl && !paused;
                                    const selected = option !== null && option === selectedAmount;
                                    return (
                                        <button
                                            key={option ?? index}
                                            type="button"
                                            disabled={!selectable}
                                            onClick={() => option && setPicked(option)}
                                            className={cn(
                                                "flex h-14 flex-col justify-center rounded-[6px] border px-4 text-left transition-colors",
                                                selected ? "border-[#F59E0B] bg-[#FFF8E6]" : "border-[#D9D9D9] bg-white",
                                                selectable ? "cursor-pointer hover:border-[#F59E0B]" : "cursor-default",
                                                !option && "opacity-50"
                                            )}
                                        >
                                            <span className="text-[18px] leading-tight font-semibold text-[#414141] tabular-nums">
                                                {option ? money(option, code) : "—"}
                                            </span>
                                            <span className="text-[10px] text-[#777777]">
                                                {option ? incrementHint(option, index, options, position, code) : "Bidding closed"}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {canControl && (
                                <div className={cn("mt-4 grid gap-3", takesFloorBids ? "grid-cols-2" : "grid-cols-1")}>
                                    {takesFloorBids && (
                                        <Button
                                            type="button"
                                            className="h-10 rounded-[6px] bg-[#22C55E] text-[13px] font-medium text-white hover:bg-[#22C55E]/90"
                                            disabled={!selectedAmount || paused || busy !== null}
                                            onClick={() => setFloorOpen(true)}
                                        >
                                            Place Bid
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        className="h-10 rounded-[6px] bg-[#F59E0B] text-[13px] font-medium text-white hover:bg-[#F59E0B]/90"
                                        disabled={!hasBids || busy !== null}
                                        title={hasBids ? undefined : "No bids yet — there's no one to sell to"}
                                        onClick={() => setHammerOpen(true)}
                                    >
                                        <Gavel className="h-4 w-4" />
                                        Sell (Hammer)
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <NoLiveLot
                            data={data}
                            onFloor={onFloor}
                            canStart={canControl && auction.status === "LIVE"}
                            starting={Boolean(data.nextLot && lotControlUuid === data.nextLot.uuid)}
                            onStart={startLot}
                        />
                    )}
                </div>

                {/* right: bid log */}
                <BidLog bids={data.bids} code={code} connected={connected} />
            </div>

            {lot && position && (
                <>
                    <HammerDialog
                        open={hammerOpen}
                        onOpenChange={setHammerOpen}
                        lot={lot}
                        position={position}
                        buyerPremium={data.buyerPremium}
                        busy={busy === "hammer"}
                        onConfirm={confirmHammer}
                    />
                    {takesFloorBids && (
                        <FloorBidDialog
                            open={floorOpen}
                            onOpenChange={setFloorOpen}
                            itemNumber={lot.itemNumber}
                            currency={code}
                            amount={selectedAmount ?? position.nextBid}
                            nextBid={position.nextBid}
                            floorBidders={data.floorBidders}
                            busy={busy === "floor"}
                            onSubmit={submitFloorBid}
                        />
                    )}
                </>
            )}
        </ConsoleFrame>
    );
}

// =====================================================================
// STATE HELPERS
// =====================================================================

/** A fetched console that is older than what the socket already showed for the same lot */
const isBehind = (next: ConsoleData, prev: ConsoleData | null) =>
    Boolean(
        prev?.lot &&
            prev.position &&
            next.lot?.uuid === prev.lot.uuid &&
            next.position &&
            Number(next.position.bidCount) < Number(prev.position.bidCount)
    );

/** New bids from "bid:new" on the live lot (bids newest first; the first one leads) */
const applyBids = (
    prev: ConsoleData,
    lotUuid: string,
    event: { currentBid: string | null; bidCount: string; nextBid: string; bidOptions: string[]; bids: StaffBid[] }
): ConsoleData => {
    if (!prev.lot || !prev.position || prev.lot.uuid !== lotUuid) return prev;
    if (Number(event.bidCount) < Number(prev.position.bidCount)) return prev; // arrived late

    const known = new Set(prev.bids.map((bid) => bid.uuid));
    const top = event.bids[0];
    const reserve = prev.lot.reservePrice === null ? null : Number(prev.lot.reservePrice);

    return {
        ...prev,
        position: {
            currentBid: event.currentBid,
            bidCount: event.bidCount,
            nextBid: event.nextBid,
            bidOptions: prev.auction.status === "LIVE" ? event.bidOptions : [],
            reserveMet: event.currentBid !== null && (reserve === null || Number(event.currentBid) >= reserve),
            leader: top
                ? { ...(top.bidder ?? { uuid: null, paddle: null, name: null }), source: top.source }
                : prev.position.leader,
        },
        bids: [...event.bids.filter((bid) => !known.has(bid.uuid)), ...prev.bids].slice(0, LOG_LIMIT),
    };
};

/** "+ ₹50K Increment" over the current bid; the steps beyond the next ask are skips */
const incrementHint = (option: string, index: number, options: string[], position: ConsolePosition | null, code: string) => {
    if (position?.currentBid === null || position?.currentBid === undefined) {
        return index === 0 ? "Opening bid" : `+ ${compactMoney(Number(option) - Number(options[0]), code)} over opening`;
    }
    const step = compactMoney(Number(option) - Number(position.currentBid), code);
    return index === 0 ? `+ ${step} Increment` : `+ ${step} Skip Increment`;
};

// =====================================================================
// PIECES
// =====================================================================

const ConsoleFrame = ({
    title,
    status,
    lots,
    children,
}: {
    title: string | null;
    status?: string;
    lots?: string;
    children: ReactNode;
}) => (
    <div className="mx-8 my-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#414141]">
                <Link href="/dashboard/auctions/live-auctions" className="hover:underline">
                    Manage Auction
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span>Open Console</span>
            </nav>
            {title && (
                <p className="flex min-w-0 items-center gap-2 text-[12px] text-slate-500">
                    <span className="truncate font-medium text-[#414141]" title={title}>
                        {title}
                    </span>
                    {status && (
                        <span
                            className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                                status === "LIVE" ? "bg-[#E4F7F0] text-[#00865A]" : "bg-[#FFF3D6] text-[#9A6700]"
                            )}
                        >
                            {status}
                        </span>
                    )}
                    {lots && <span className="hidden sm:inline">· {lots}</span>}
                </p>
            )}
        </div>
        {children}
    </div>
);

const LotCard = ({ lot }: { lot: ConsoleLot }) => {
    const code = lot.currency.code;
    const estimate =
        lot.estimateLow || lot.estimateHigh
            ? `${money(lot.estimateLow, code)} – ${money(lot.estimateHigh, code)}`
            : "—";
    const reserve = lot.reservePrice ? money(lot.reservePrice, code) : money(lot.startingPrice, code);

    return (
        <section className="flex gap-4 rounded-[8px] border border-[#E5E5E5] bg-white p-4">
            <div className="h-26 w-26 shrink-0 overflow-hidden rounded-[4px] bg-[#F3F0E9]">
                {lot.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lot.imageUrl} alt={lot.title} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageOff className="h-6 w-6" />
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[18px] font-semibold text-[#7A3D5E]">LOT #{lot.itemNumber}</span>
                    {lot.category && (
                        <span className="rounded-[3px] border border-[#F5C26B] bg-[#FFF8E6] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#D69E2E]">
                            {lot.category}
                        </span>
                    )}
                </div>
                <p className="mt-2 truncate text-[20px] font-semibold text-[#414141]" title={lot.artistName ?? lot.title}>
                    {lot.artistName || lot.title}
                </p>
                {lot.artistName && (
                    <p className="truncate text-[13px] text-[#555555]" title={lot.title}>
                        {lot.title}
                    </p>
                )}

                <dl className="mt-3 grid max-w-md grid-cols-2 gap-4">
                    <div className="min-w-0">
                        <dt className="text-[10px] font-medium text-[#777777]">Estimate</dt>
                        <dd className="truncate text-[14px] font-semibold text-[#414141]" title={estimate}>
                            {estimate}
                        </dd>
                    </div>
                    <div className="min-w-0">
                        <dt className="text-[10px] font-medium text-[#777777]">{lot.reservePrice ? "Reserve / Base" : "Base"}</dt>
                        <dd className="truncate text-[14px] font-semibold text-[#414141]">{reserve}</dd>
                    </div>
                </dl>
            </div>
        </section>
    );
};

const CurrentAsk = ({ position, code }: { position: ConsolePosition; code: string }) => {
    const leader = position.leader;
    const hasBid = position.currentBid !== null;

    return (
        <section className="mt-5 flex min-h-55 flex-col items-center justify-center rounded-[8px] bg-[#F4F4F4] px-6 py-8 text-center">
            <p className="text-[13px] font-semibold text-[#555555]">{hasBid ? "Current Ask & Highest Bid" : "Opening Ask"}</p>
            {/* keyed on the amount so each new bid flashes in */}
            <p
                key={position.currentBid ?? position.nextBid}
                className="mt-1 text-[40px] leading-tight font-bold text-[#414141] tabular-nums animate-in fade-in-0 zoom-in-95 duration-300 sm:text-[44px]"
            >
                {money(hasBid ? position.currentBid : position.nextBid, code)}
            </p>
            {leader ? (
                <>
                    <span className="mt-2 rounded-full border border-[#22C55E] bg-white px-3 py-0.5 text-[12px] font-medium text-[#16A34A]">
                        Leading: {paddleLabel(leader)} ({sourceBadge(leader.source).label})
                    </span>
                    {leader.paddle && leader.name && <span className="mt-1 text-[11px] text-slate-500">{leader.name}</span>}
                </>
            ) : (
                <span className="mt-2 rounded-full border border-slate-300 bg-white px-3 py-0.5 text-[12px] text-slate-500">
                    No bids yet
                </span>
            )}
            {hasBid && !position.reserveMet && (
                <span className="mt-2 text-[11px] font-medium text-amber-700">Reserve not met</span>
            )}
        </section>
    );
};

const BidLog = ({ bids, code, connected }: { bids: StaffBid[]; code: string; connected: boolean }) => (
    <aside className="flex min-h-80 flex-col rounded-[8px] bg-[#F4F4F4] p-3 lg:max-h-[calc(100vh-10rem)]">
        <div className="flex items-center justify-between px-1 pb-3">
            <p className="text-[13px] font-semibold text-[#414141]">Real-Time Bidding Log</p>
            <span
                title={connected ? "Receiving bids live" : "Reconnecting…"}
                className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-[#22C55E]" : "animate-pulse bg-amber-500")}
            />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
            {bids.length === 0 ? (
                <p className="rounded-[6px] bg-white px-3 py-8 text-center text-[12px] text-slate-500">
                    No bids on this lot yet. They appear here the moment they&apos;re placed.
                </p>
            ) : (
                <ol className="rounded-[6px] bg-white py-1">
                    {bids.map((bid, index) => {
                        const badge = sourceBadge(bid.source);
                        return (
                            <li
                                key={bid.uuid}
                                title={bid.bidder?.name ?? undefined}
                                className={cn(
                                    "grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 text-[12px] animate-in fade-in-0 slide-in-from-top-1 duration-300",
                                    index === 0 && "bg-emerald-50/60"
                                )}
                            >
                                <span
                                    className={cn(
                                        "w-fit rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                                        badge.className
                                    )}
                                >
                                    {badge.label}
                                </span>
                                <span className="truncate text-[#555555]">
                                    {bid.bidder?.paddle ? `Paddle No. #${bid.bidder.paddle}` : bid.bidder?.name ?? "Unknown bidder"}
                                </span>
                                <span className="font-semibold text-[#414141] tabular-nums">{money(bid.amount, code)}</span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    </aside>
);

const SoldBanner = ({ sale }: { sale: HammerResult }) => (
    <div className="mb-4 flex items-start gap-3 rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900">
        <Gavel className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
            <span className="font-semibold">Lot #{sale.lot.itemNumber} sold</span> to {paddleLabel(sale.winner)}
            {sale.winner.paddle && sale.winner.name ? ` (${sale.winner.name})` : ""} for{" "}
            <span className="font-semibold">{money(sale.hammerPrice, sale.currency.code)}</span>
            {Number(sale.buyerPremium) > 0 && (
                <> · total due {money(sale.totalAmountDue, sale.currency.code)} with buyer&apos;s premium</>
            )}
        </p>
    </div>
);

const NoLiveLot = ({
    data,
    onFloor,
    canStart,
    starting,
    onStart,
}: {
    data: ConsoleData;
    onFloor: boolean;
    canStart: boolean;
    starting: boolean;
    onStart: (lotUuid: string) => void;
}) => {
    const next = data.nextLot;
    return (
        <div className="flex min-h-100 flex-1 flex-col items-center justify-center rounded-[8px] border border-dashed border-gray-300 bg-gray-50/70 px-6 py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Gavel className="h-7 w-7 text-gray-500" strokeWidth={1.5} />
            </div>

            {!onFloor ? (
                <>
                    <h3 className="text-lg font-semibold text-[#414141]">This auction isn&apos;t running</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                        It&apos;s {data.auction.status.toLowerCase()}. The console takes bids while the sale is live.
                    </p>
                </>
            ) : next ? (
                <>
                    <h3 className="text-lg font-semibold text-[#414141]">No lot is live right now</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                        Next up: <span className="font-medium text-[#414141]">Lot #{next.itemNumber}</span> · {next.title}
                        {next.status === "UNSOLD" && " (re-offer)"}
                    </p>
                    {canStart ? (
                        <Button
                            type="button"
                            className="mt-5 h-10 gap-2 rounded-[6px] bg-[#22C55E] px-5 text-white hover:bg-[#22C55E]/90"
                            disabled={starting}
                            onClick={() => onStart(next.uuid)}
                        >
                            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                            Start Lot #{next.itemNumber}
                        </Button>
                    ) : (
                        data.auction.status === "PAUSED" && (
                            <p className="mt-3 text-[12px] text-amber-700">Resume the auction to start the next lot.</p>
                        )
                    )}
                </>
            ) : (
                <>
                    <h3 className="text-lg font-semibold text-[#414141]">All lots are closed</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                        Every lot in this sale has been offered. End the auction from Auction Campaigns when you&apos;re done.
                    </p>
                </>
            )}
        </div>
    );
};

const ConsoleSkeleton = () => (
    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
            <div className="h-34 animate-pulse rounded-[8px] bg-slate-100" />
            <div className="h-55 animate-pulse rounded-[8px] bg-slate-100" />
            <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-[6px] bg-slate-100" />
                ))}
            </div>
        </div>
        <div className="h-120 animate-pulse rounded-[8px] bg-slate-100" />
    </div>
);
