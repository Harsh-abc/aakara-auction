"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/hooks/redux";
import { getErrorMessage } from "@/lib/apiError";
import type { MyLotStanding } from "@/lib/types/bidding.types";
import type { PublicLot } from "@/lib/types/publicAuction.types";
import { cn } from "@/lib/utils";
import { getMyLotStanding, placeBid, setProxyBid } from "@/services/operations/bidding.api";

import { auctionHref } from "../auctionDisplay";
import { formatMoney, lotHeading } from "../detail/lotDisplay";
import { AmountSelect } from "./AmountSelect";
import { bidCountLabel, lotTag, UPCOMING_LOT_STATUSES } from "./lotPageDisplay";
import type { BidKind } from "./useBidAction";

const SMALL_CAPS = "text-[10px] uppercase tracking-[0.18em]";
const ACTION = "inline-flex h-11 cursor-pointer items-center justify-center px-6 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

// the amounts, plus `amount` in its place when it isn't one of them
const withAmount = (amounts: string[], amount: string | null) =>
    amount === null || amounts.some((option) => Number(option) === Number(amount)) ? amounts : [...amounts, amount].sort((a, b) => Number(a) - Number(b));

type BidDialogProps = {
    auctionUuid: string;
    /** the lot as the page has it — a new bid on it refreshes the dialog's numbers */
    lot: PublicLot | null;
    kind: BidKind;
    onKindChange: (kind: BidKind) => void;
    onClose: () => void;
    /** a bid or proxy went through */
    onSaved?: () => void;
};

// place a bid on a live lot, or leave a proxy (maximum) bid on an upcoming one — changeable until it opens
export function BidDialog({ auctionUuid, lot, kind, onKindChange, onClose, onSaved }: BidDialogProps) {
    const token = useAppSelector((state) => state.auth.accessToken);

    const [standing, setStanding] = useState<MyLotStanding | null>(null);
    const [loadError, setLoadError] = useState<{ lotUuid: string; message: string } | null>(null);
    const [reload, setReload] = useState(0);
    // the maximum the bidder picked, for this lot only
    const [picked, setPicked] = useState<{ key: string; amount: string }>({ key: "", amount: "" });
    // the amount waiting on the bidder's confirmation
    const [confirming, setConfirming] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    // the bid dialog's height, so the confirmation covers it exactly
    const [bidPanel, setBidPanel] = useState<HTMLDivElement | null>(null);
    const [bidPanelHeight, setBidPanelHeight] = useState<number | null>(null);

    useEffect(() => {
        if (!bidPanel) return;
        const observer = new ResizeObserver(() => setBidPanelHeight(bidPanel.offsetHeight));
        observer.observe(bidPanel);
        return () => observer.disconnect();
    }, [bidPanel]);

    const lotUuid = lot?.uuid;
    const bidCount = lot?.bidCount;
    const lotStatus = lot?.status;

    useEffect(() => {
        if (!lotUuid) return;
        let cancelled = false;
        getMyLotStanding(lotUuid, token)
            .then((data) => {
                if (cancelled) return;
                setStanding(data);
                setLoadError(null);
            })
            .catch((err) => {
                if (!cancelled) setLoadError({ lotUuid, message: getErrorMessage(err) });
            });
        return () => {
            cancelled = true;
        };
    }, [lotUuid, bidCount, lotStatus, token, reload]);

    if (!lot) return null;

    const current = standing?.lotUuid === lot.uuid ? standing : null;
    const error = !current && loadError?.lotUuid === lot.uuid ? loadError.message : null;
    const money = (amount: string | number | null) => formatMoney(amount, current?.currency ?? lot.currency) ?? "—";

    const count = Number(current?.bidCount ?? lot.bidCount) || 0;
    const verified = current?.registration === "VERIFIED";
    const allowed = kind === "bid" ? current?.canBid : current?.canProxy;
    const leadingOnBid = kind === "bid" && current?.leading;
    // proxy bids close as soon as the lot opens (the page's live status can be ahead of the dialog's)
    const proxyOpen = UPCOMING_LOT_STATUSES.includes(lot.status) && (!current || UPCOMING_LOT_STATUSES.includes(current.status));
    // the bidder's proxy, changeable until the lot opens and locked after
    const proxyMax = kind === "proxy" ? (current?.proxyMax ?? null) : null;
    const proxyLocked = Boolean(proxyMax) && !proxyOpen;

    // the maximums on offer, with the bidder's current one among them
    const proxyOptions = kind === "proxy" ? withAmount(current?.proxyOptions ?? [], proxyMax) : [];
    // a bid is always the next valid bid; a proxy is the maximum picked (the current one until another is picked).
    // a new bid moves the options up — a pick that's no longer offered falls back
    const pickKey = `${lot.uuid}:${kind}`;
    const value = kind === "bid" ? (current?.nextBid ?? "") : picked.key === pickKey && proxyOptions.includes(picked.amount) ? picked.amount : (proxyMax ?? proxyOptions[0] ?? "");
    const amount = value ? Number(value) : NaN;
    const sameAsProxy = proxyMax !== null && amount === Number(proxyMax);

    // why this kind of bid can't be placed right now (null = it can)
    let blocker: ReactNode = null;
    if (current && current.registration === "NOT_REGISTERED") {
        blocker = (
            <>
                Register for this sale to bid on its lots.{" "}
                <Link href={auctionHref({ uuid: auctionUuid })} onClick={onClose} className="text-neutral-950 underline underline-offset-2">
                    Register to bid
                </Link>
            </>
        );
    } else if (current && current.registration === "PENDING") {
        blocker = "Your registration is pending approval. Bidding will be enabled once verified.";
    } else if (current && proxyLocked) {
        blocker = (
            <>
                Your maximum bid of <span className="font-medium text-neutral-950">{money(proxyMax)}</span> is set. {lotTag(lot)} has opened, so it can no longer be changed.
            </>
        );
    } else if (current && kind === "proxy" && proxyOpen && !current.proxyEnabled) {
        blocker = current.proxyMax
            ? `Proxy bids are turned off for this sale. Your maximum bid of ${money(current.proxyMax)} still stands, but it can't be changed.`
            : `Proxy bids are turned off for this sale. You can bid when ${lotTag(lot)} opens.`;
    } else if (current && kind === "proxy" && !proxyOpen && current.status === "ACTIVE") {
        blocker = (
            <>
                {lotTag(lot)} is live — proxy bids close when a lot opens.{" "}
                {current.canBid && (
                    <button type="button" onClick={() => onKindChange("bid")} className="cursor-pointer text-neutral-950 underline underline-offset-2">
                        Place bid instead
                    </button>
                )}
            </>
        );
    } else if (current && !allowed) {
        if (kind === "bid" && UPCOMING_LOT_STATUSES.includes(current.status)) {
            blocker = current.canProxy ? (
                current.proxyMax ? (
                    <>
                        {lotTag(lot)} isn&apos;t on the block yet. Your maximum bid of {money(current.proxyMax)} is placed for you when the auctioneer calls the hammer.{" "}
                        <button type="button" onClick={() => onKindChange("proxy")} className="cursor-pointer text-neutral-950 underline underline-offset-2">
                            Change it
                        </button>{" "}
                        until the lot opens.
                    </>
                ) : (
                    <>
                        {lotTag(lot)} isn&apos;t on the block yet.{" "}
                        <button type="button" onClick={() => onKindChange("proxy")} className="cursor-pointer text-neutral-950 underline underline-offset-2">
                            Leave a proxy bid
                        </button>{" "}
                        and it&apos;s placed for you when the auctioneer calls the hammer.
                    </>
                )
            ) : current.proxyMax ? (
                `${lotTag(lot)} isn't on the block yet. Your maximum bid of ${money(current.proxyMax)} is placed for you when the auctioneer calls the hammer.`
            ) : (
                `${lotTag(lot)} isn't on the block yet. You can bid when it opens.`
            );
        } else if (kind === "bid" && current.status === "ACTIVE" && current.auctionStatus === "PAUSED") {
            blocker = "Bidding is paused. It resumes when the auctioneer restarts the sale.";
        } else {
            blocker = `Bidding on ${lotTag(lot)} has closed.`;
        }
    }

    const canPlace = Boolean(current && verified && allowed && !leadingOnBid && !submitting && (kind === "bid" || proxyOpen));
    const canSubmit = canPlace && amount > 0 && !sameAsProxy;

    // someone bid while the bidder was confirming, and the amount no longer reaches the next bid
    const outpaced = kind === "bid" && confirming !== null && Number(current?.nextBid) > confirming;

    const review = () => {
        if (canSubmit) setConfirming(amount);
    };

    const submit = async () => {
        if (!canPlace || confirming === null || outpaced) return;
        setSubmitting(true);
        try {
            const { message, data } = kind === "bid" ? await placeBid(lot.uuid, confirming, token) : await setProxyBid(lot.uuid, confirming, token);
            // topped straight away by someone's proxy: say so, but it isn't an error
            if (data.leading || data.status !== "ACTIVE") toast.success(message);
            else toast(message, { icon: "⚠️" });
            setPicked({ key: "", amount: "" });
            setConfirming(null);
            onSaved?.();
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err, "Your bid didn't go through. Please try again."));
            setConfirming(null);
            // someone may have bid first — show the new asking price
            setReload((n) => n + 1);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open && !submitting) onClose();
    };

    const handleConfirmOpenChange = (open: boolean) => {
        if (!open && !submitting) setConfirming(null);
    };

    const rows = current
        ? [
              { term: count > 0 ? `Current bid · ${bidCountLabel(count)}` : "Starting bid", value: money(count > 0 ? current.currentBid : lot.startingPrice) },
              current.proxyMax ? { term: "Your maximum bid", value: money(current.proxyMax) } : null,
          ].filter((row): row is { term: string; value: string } => row !== null)
        : [];

    return (
        <Dialog open onOpenChange={handleOpenChange}>
            <DialogContent ref={setBidPanel} showCloseButton={false} className="max-h-[90dvh] gap-0 overflow-y-auto rounded-none p-6 sm:max-w-md">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-5">
                    <DialogHeader className="gap-2">
                        <p className={cn(SMALL_CAPS, "text-neutral-500")}>
                            {kind === "bid" ? "Place bid" : "Proxy bid"} · {lotTag(lot)}
                        </p>
                        <DialogTitle className="text-lg leading-snug font-normal text-neutral-950">{lotHeading(lot)}</DialogTitle>
                        <DialogDescription className="sr-only">{kind === "bid" ? "Place a bid on this lot" : "Set the most you're willing to pay for this lot"}</DialogDescription>
                    </DialogHeader>
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        disabled={submitting}
                        aria-label="Close"
                        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center border border-neutral-300 text-neutral-950 transition-colors not-disabled:hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <XIcon className="size-4" strokeWidth={1.5} />
                    </button>
                </div>

                {error ? (
                    <p className="pt-5 text-sm text-red-600">{error}</p>
                ) : !current ? (
                    <div className="space-y-3 pt-5">
                        <Skeleton className="h-5 w-full rounded-none" />
                        <Skeleton className="h-11 w-full rounded-none" />
                        <Skeleton className="h-11 w-full rounded-none" />
                    </div>
                ) : (
                    <>
                        <dl className="mt-5 space-y-2">
                            {rows.map(({ term, value: rowValue }) => (
                                <div key={term} className="flex items-center justify-between gap-4">
                                    <dt className="text-xs text-neutral-500">{term}</dt>
                                    <dd className="text-right text-sm text-neutral-950 tabular-nums">{rowValue}</dd>
                                </div>
                            ))}
                        </dl>

                        {blocker ? (
                            <p className="mt-6 text-sm leading-relaxed text-neutral-600">{blocker}</p>
                        ) : leadingOnBid ? (
                            <p className="mt-6 text-sm leading-relaxed text-neutral-600">You&apos;re the highest bidder.</p>
                        ) : kind === "bid" ? (
                            <div className="mt-6">
                                <p className={cn(SMALL_CAPS, "text-neutral-500")}>Your bid</p>
                                <button
                                    type="button"
                                    onClick={review}
                                    disabled={!canSubmit}
                                    className={cn(ACTION, "mt-3 w-full justify-between bg-neutral-950 px-5 text-white not-disabled:hover:bg-neutral-800")}
                                >
                                    <span>Next bid</span>
                                    <span className="tracking-widest tabular-nums">{money(current.nextBid)}</span>
                                </button>
                                <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                                    Bids follow the auction's prescribed increments and cannot be withdrawn once placed. Minimum next bid {money(current.nextBid)}.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6">
                                <label htmlFor="bid-amount" className={cn(SMALL_CAPS, "text-neutral-500")}>
                                    Maximum bid amount
                                </label>
                                <AmountSelect
                                    id="bid-amount"
                                    value={value}
                                    options={proxyOptions}
                                    onChange={(next) => setPicked({ key: pickKey, amount: next })}
                                    format={money}
                                    disabled={submitting}
                                    className="mt-3"
                                />
                                {sameAsProxy && <p className="mt-2 text-xs text-neutral-500">This is your current maximum. Pick another amount to change it.</p>}
                                <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                                    This bid is placed by you to a maximum amount you are willing to pay, and the auction system automatically bids on your behalf, only increasing the bid as necessary
                                    to maintain your position.
                                </p>
                                <button type="button" onClick={review} disabled={!canSubmit} className={cn(ACTION, "mt-4 w-full bg-neutral-950 text-white not-disabled:hover:bg-neutral-800")}>
                                    {amount > 0 ? `${proxyMax ? "Update" : "Set"} maximum ${money(amount)}` : proxyMax ? "Update maximum" : "Set maximum"}
                                </button>
                            </div>
                        )}

                        {/* or leave a proxy instead (proxy closes once the lot opens) */}
                        {kind === "bid" && (
                            <>
                                <p className={cn(SMALL_CAPS, "mt-4 text-center text-neutral-400")}>or</p>
                                <button
                                    type="button"
                                    onClick={() => onKindChange("proxy")}
                                    disabled={submitting || !proxyOpen}
                                    title={proxyOpen ? undefined : "Proxy bids close when the lot opens"}
                                    className={cn(ACTION, "mt-4 w-full border border-neutral-950 bg-white text-neutral-950 not-disabled:hover:bg-neutral-50")}
                                >
                                    Proxy bid
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* last look before the bid is sent */}
                <Dialog open={confirming !== null} onOpenChange={handleConfirmOpenChange}>
                    {/* same size as the bid dialog behind it, so it sits squarely on top; the buttons stay at the bottom */}
                    <DialogContent
                        showCloseButton={false}
                        style={bidPanelHeight ? { height: bidPanelHeight } : undefined}
                        className="flex max-h-[90dvh] flex-col gap-0 overflow-y-auto rounded-none p-0 sm:max-w-md"
                    >
                        <DialogHeader className="border-b border-neutral-200 p-6">
                            <p className={cn(SMALL_CAPS, "text-neutral-500")}>{lotTag(lot)}</p>
                            <DialogTitle className="text-xl leading-snug font-light text-neutral-950">{kind === "bid" ? "Confirm your bid" : "Confirm your maximum bid"}</DialogTitle>
                            <DialogDescription className="text-sm text-neutral-600">{lotHeading(lot)}</DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 p-6">
                            <p className={cn(SMALL_CAPS, "text-neutral-500")}>{kind === "bid" ? "Your bid" : "Your maximum bid"}</p>
                            <p className="mt-2 text-3xl font-light tabular-nums text-neutral-950">{money(confirming)}</p>
                            <p className={cn("mt-4 text-xs leading-relaxed", outpaced ? "text-red-600" : "text-neutral-500")}>
                                {outpaced
                                    ? `Another bidder got there first — the next bid is now ${money(current?.nextBid ?? null)}. Go back and choose again.`
                                    : kind === "bid"
                                      ? "By confirming, you agree to purchase this lot at the stated price, premiums and applicable taxes if you win. Bids are binding and cannot be withdrawn."
                                      : `We'll bid for you up to this amount when the auctioneer calls the hammer. If it wins, you agree to buy this lot at the winning price.${proxyMax ? ` It replaces your current maximum of ${money(proxyMax)}.` : ""} You can change it until the lot opens; after that it can't be changed or withdrawn.`}
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 p-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => handleConfirmOpenChange(false)}
                                disabled={submitting}
                                className={cn(ACTION, "border border-neutral-950 bg-white text-neutral-950 not-disabled:hover:bg-neutral-50")}
                            >
                                Back
                            </button>
                            <button type="button" onClick={submit} disabled={submitting || !canPlace || outpaced} className={cn(ACTION, "bg-neutral-950 text-white not-disabled:hover:bg-neutral-800")}>
                                {submitting ? "Sending..." : kind === "bid" ? "Confirm bid" : "Confirm maximum"}
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}
