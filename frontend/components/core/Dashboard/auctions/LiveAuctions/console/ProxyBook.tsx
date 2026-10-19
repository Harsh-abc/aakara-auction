"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

import { describeDevice } from "@/components/core/Dashboard/home/dashboardUi";
import type { ConsolePosition } from "@/lib/types/bidding.types";
import type { LotProxies, ProxyBidRow } from "@/lib/types/proxyBid.types";
import { cn } from "@/lib/utils";
import { getLotProxies } from "@/services/operations/proxyBid.api";
import { VIEWER_TIME_ZONE } from "@/utils/auctionTime";

import { money, paddleLabel } from "./consoleDisplay";

const setAtFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: VIEWER_TIME_ZONE,
});

const STATUS_STYLES = {
    leading: { label: "Leading", className: "bg-[#E4F7F0] text-[#00865A]" },
    winsAtHammer: { label: "Wins at hammer", className: "bg-[#FFF3D6] text-[#B7791F]" },
    inPlay: { label: "In play", className: "bg-violet-50 text-[#7b365d]" },
    outbid: { label: "Outbid", className: "bg-slate-100 text-slate-500" },
    waiting: { label: "Waiting", className: "bg-slate-100 text-slate-600" },
    withdrawn: { label: "Withdrawn", className: "bg-red-50 text-red-600" },
} as const;

type Standing = (typeof STATUS_STYLES)[keyof typeof STATUS_STYLES];

/**
 * Where each proxy stands, worked out from the console's live position so it moves
 * with every bid (the list itself is refetched on the console's resync). Proxies
 * don't bid during the lot — they're placed when Sell is clicked, so the strongest
 * one that can top the standing bid "wins at hammer"; others that can top it push
 * the price ("in play"). Rows arrive strongest first (highest max, then earliest).
 */
const standings = (
    proxies: ProxyBidRow[],
    live: boolean,
    position: ConsolePosition | null,
    startingPrice: string | null
): Map<string, Standing> => {
    const result = new Map<string, Standing>();
    const leaderUuid = position?.leader?.uuid ?? null;
    const current = position?.currentBid != null ? Number(position.currentBid) : null;
    // a proxy equal to the standing bid takes it (it was set before the lot opened)
    const canTop = (row: ProxyBidRow) => {
        const max = Number(row.maxAmount);
        if (current === null) return startingPrice !== null && max >= Number(startingPrice);
        return max > current || (max === current && row.bidder.uuid !== leaderUuid);
    };

    let topFound = false;
    for (const row of proxies) {
        let status: Standing;
        if (row.withdrawnAt) status = STATUS_STYLES.withdrawn;
        else if (!live) status = STATUS_STYLES.waiting;
        else if (leaderUuid && row.bidder.uuid === leaderUuid) {
            status = STATUS_STYLES.leading;
            topFound = true; // their own proxy defends the lead
        } else if (canTop(row)) {
            status = topFound ? STATUS_STYLES.inPlay : STATUS_STYLES.winsAtHammer;
            topFound = true;
        } else status = STATUS_STYLES.outbid;
        result.set(row.id, status);
    }
    return result;
};

interface ProxyBookProps {
    token: string | null;
    lotUuid: string;
    itemNumber: string;
    /** the lot is on the block (otherwise it's the next one up) */
    live: boolean;
    /** the live lot's starting price (a proxy needs it to open a lot with no bids) */
    startingPrice: string | null;
    position: ConsolePosition | null;
    code: string;
    /** the console's refetch counter — reloads the list with it */
    reload: number;
}

// The auctioneer's book of proxy (maximum) bids on the lot: who, how high, and who's still in
export default function ProxyBook({ token, lotUuid, itemNumber, live, startingPrice, position, code, reload }: ProxyBookProps) {
    const key = `${lotUuid}|${reload}`;
    const [state, setState] = useState<{ key: string; lotUuid: string; data: LotProxies | null; failed: boolean } | null>(null);

    useEffect(() => {
        let cancelled = false;
        getLotProxies(lotUuid, token)
            .then((data) => {
                if (!cancelled) setState({ key, lotUuid, data, failed: false });
            })
            .catch(() => {
                // keep the last good list for the same lot
                if (!cancelled) setState((prev) => ({ key, lotUuid, data: prev?.lotUuid === lotUuid ? prev.data : null, failed: true }));
            });
        return () => {
            cancelled = true;
        };
    }, [token, lotUuid, key]);

    const data = state?.lotUuid === lotUuid ? state.data : null;
    const proxies = data?.proxies ?? [];
    const statusOf = standings(proxies, live, position, startingPrice);
    const inPlay = proxies.filter((row) => !row.withdrawnAt);
    const stillIn = live ? inPlay.filter((row) => statusOf.get(row.id) !== STATUS_STYLES.outbid).length : inPlay.length;

    return (
        <section className="flex min-h-40 flex-col rounded-[8px] bg-[#F4F4F4] p-3 lg:max-h-96">
            <div className="flex items-start justify-between gap-2 px-1 pb-3">
                <div>
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#414141]">
                        <Bot className="h-3.5 w-3.5" />
                        Proxy Bids · Lot #{itemNumber}
                    </p>
                    <p className="text-[10px] text-[#777777]">
                        {live ? "Placed when you click Sell — the highest takes the lot" : "Next up — placed when that lot is hammered"}
                    </p>
                </div>
                {inPlay.length > 0 && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#555555]" title="Proxies that can still top the standing bid">
                        {stillIn} / {inPlay.length} in
                    </span>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {!data ? (
                    <p className="rounded-[6px] bg-white px-3 py-6 text-center text-[12px] text-slate-500">
                        {state?.failed ? "Couldn't load the proxy bids." : "Loading proxy bids…"}
                    </p>
                ) : proxies.length === 0 ? (
                    <p className="rounded-[6px] bg-white px-3 py-6 text-center text-[12px] text-slate-500">No proxy bids on this lot.</p>
                ) : (
                    <ol className="rounded-[6px] bg-white py-1">
                        {proxies.map((row, index) => {
                            const status = statusOf.get(row.id) ?? STATUS_STYLES.waiting;
                            const origin = data.canSeeOrigin && row.ipAddress ? [row.ipAddress, describeDevice(row.userAgent)].filter(Boolean).join(" · ") : null;
                            return (
                                <li
                                    key={row.id}
                                    className={cn(
                                        "grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-2 px-2 py-1.5 text-[12px]",
                                        status === STATUS_STYLES.leading && "bg-emerald-50/60",
                                        status === STATUS_STYLES.winsAtHammer && "bg-amber-50/60",
                                        (status === STATUS_STYLES.outbid || status === STATUS_STYLES.withdrawn) && "opacity-60"
                                    )}
                                >
                                    <span className="pt-0.5 text-[10px] text-slate-400">{row.withdrawnAt ? "—" : index + 1}</span>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-[#414141]" title={row.bidder.name ?? undefined}>
                                            {paddleLabel(row.bidder)}
                                        </p>
                                        <p className="truncate text-[10px] text-[#777777]">
                                            {[row.bidder.paddle ? row.bidder.name : null, `Set ${setAtFmt.format(new Date(row.createdAt))}`]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>
                                        {origin && (
                                            <p className="truncate font-mono text-[10px] text-[#777777]" title={row.userAgent ?? undefined}>
                                                {origin}
                                                {row.ipSharedBy > 1 && <span className="ml-1 font-sans text-red-600">· shared IP</span>}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("font-semibold text-[#414141] tabular-nums", row.withdrawnAt && "line-through")}>
                                            {money(row.maxAmount, code)}
                                        </p>
                                        <span
                                            className={cn(
                                                "mt-0.5 inline-block rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                                                status.className
                                            )}
                                        >
                                            {status.label}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </section>
    );
}
