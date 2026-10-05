import { ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LiveAuctionSummary } from "@/lib/types/auction.types";
import { formatMoney } from "@/lib/types/LotRow";
import { cn } from "@/lib/utils";

interface LiveAuctionsCardProps {
    auction: LiveAuctionSummary;
    /** This auction's lots are shown in the table below */
    selected?: boolean;
    onManage?: (auction: LiveAuctionSummary) => void;
}

export default function LiveAuctionsCard({ auction, selected = false, onManage }: LiveAuctionsCardProps) {
    const isLive = auction.status === "LIVE";
    const { low, high, currency } = auction.estimate;

    return (
        <div
            className={cn(
                "flex h-full w-full overflow-hidden rounded-xl border bg-white shadow-sm",
                selected ? "border-[#E5A000] ring-2 ring-[#E5A000]/40" : "border-[#E5A000]/50"
            )}
        >
            <div className="relative min-h-60 w-[44%] shrink-0 bg-[#F3F0E9]">
                {auction.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={auction.coverImageUrl}
                        alt={auction.title}
                        className="absolute inset-0 h-full w-full object-cover p-1"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageOff className="h-8 w-8" />
                    </div>
                )}
            </div>

            {/* Auction Details */}
            <div className="flex min-w-0 flex-1 flex-col p-4">
                <div>
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
                            isLive ? "bg-[#E4F7F0] text-[#00865A]" : "bg-[#FFF3D6] text-[#9A6700]"
                        )}
                    >
                        {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00865A]" />}
                        {auction.status}
                    </span>

                    <h3 className="mt-3 truncate text-[18px] font-bold text-[#414141]" title={auction.title}>
                        {auction.title}
                    </h3>

                    <p className="mt-1 truncate text-xs text-[#7A3D5E]">
                        {auction.liveLot ? (
                            <>
                                Live Lot <span className="font-medium">#{auction.liveLot.itemNumber}</span>
                                <span className="mx-1">·</span>
                                <span title={auction.liveLot.title}>{auction.liveLot.title}</span>
                            </>
                        ) : (
                            <span className="text-slate-500">No lot live right now</span>
                        )}
                    </p>
                </div>

                <div className="my-3 border-t border-[#E5E5E5]" />

                {/* Auction Stats */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                    <Stat label="Lots closed" value={`${auction.closedLots} / ${auction.lotCount}`} />
                    <Stat label="Verified bidders" value={auction.verifiedBidders.toLocaleString("en-IN")} />
                    <Stat
                        label="Est. Total"
                        value={low || high ? `${formatMoney(low, currency)} – ${formatMoney(high, currency)}` : "—"}
                    />
                    <Stat label="Auctioneer" value={auction.auctioneer ?? "—"} />
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onManage?.(auction)}
                    className={cn(
                        "mt-4 h-11 w-full cursor-pointer rounded-lg text-sm font-medium",
                        selected
                            ? "border-[#E5A000] bg-[#FFF8E6] text-[#414141]"
                            : "border-[#777777] bg-white text-[#414141]"
                    )}
                >
                    {selected ? "Managing below" : "Manage Auction"}
                </Button>
            </div>
        </div>
    );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0">
        <p className="text-[10px] uppercase text-[#777777]">{label}</p>
        <p className="truncate text-sm font-semibold text-[#414141]" title={value}>
            {value}
        </p>
    </div>
);
