import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { LiveAuction } from "@/lib/data";

interface LiveAuctionsCardProps {
    auction: LiveAuction;
    onManage?: (auction: LiveAuction) => void;
}

export default function LiveAuctionsCard({
    auction,
    onManage,
}: LiveAuctionsCardProps) {
    return (
        <div className="flex h-full w-full overflow-hidden rounded-xl border border-[#E5A000] bg-white shadow-sm">
         
            <div className="relative min-h-[240px] w-[44%] shrink-0 bg-[#F3F0E9]">
                <Image
                    src={auction.image}
                    alt={auction.title}
                    fill
                    className="object-cover p-1"
                    sizes="(max-width: 768px) 44vw, 300px"
                />
            </div>

            {/* Auction Details */}
            <div className="flex min-w-0 flex-1 flex-col p-4">
                <div>
                    <span
                        className={`inline-flex rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${auction.status === "LIVE"
                            ? "bg-[#E4F7F0] text-[#00865A]"
                            : auction.status === "UPCOMING"
                                ? "bg-[#FFF3D6] text-[#9A6700]"
                                : "bg-gray-100 text-gray-600"
                            }`}
                    >
                        {auction.status}
                    </span>

                    <h3 className="mt-3 text-[18px] truncate text-base font-bold text-[#414141]">
                        {auction.title}
                    </h3>

                    <p className="mt-1 text-xs text-[#7A3D5E]">
                        Current Lot{" "}
                        <span className="font-medium">
                            #{auction.currentLot}
                        </span>
                        <span className="mx-1">•</span>
                        Active Bidders:{" "}
                        <span className="font-medium">
                            {auction.activeBidders.toLocaleString("en-IN")}
                        </span>
                    </p>
                </div>

                <div className="my-3 border-t border-[#E5E5E5]" />

                {/* Auction Stats */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase text-[#777777]">
                            Est. Total
                        </p>
                        <p className="truncate text-sm font-semibold text-[#414141]">
                            {auction.estimatedTotal}
                        </p>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[10px] uppercase text-[#777777]">
                            Auctioneer
                        </p>
                        <p className="truncate text-sm font-semibold text-[#414141]">
                            {auction.auctioneer}
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onManage?.(auction)}
                    className="mt-auto h-11 w-full rounded-lg border-[#777777] bg-white text-sm font-medium text-[#414141] cursor-pointer"
                >
                    Manage Auction
                </Button>
            </div>
        </div>
    );
}