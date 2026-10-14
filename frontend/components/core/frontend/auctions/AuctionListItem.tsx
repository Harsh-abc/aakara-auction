import Link from "next/link";
import { ImageOff } from "lucide-react";

import RichTextContent from "@/components/common/RichTextContent";
import type { PublicAuction } from "@/lib/types/publicAuction.types";
import { cn } from "@/lib/utils";

import { BODY, BUTTON, BUTTON_OUTLINE, EYEBROW } from "../storefront";
import { AuctionCountdown } from "./AuctionCountdown";
import { auctionHref, auctionMeta, badgeTone, countdownFor, STOREFRONT_STATUS_LABELS, type BidderEligibility } from "./auctionDisplay";
import { RegisterToBidButton } from "./RegisterToBidButton";
import { StatusBadge } from "./StatusBadge";

// Figma "Upcoming & Live Auctions" row: 280px cover | details | 288px countdown + actions, 24px inset
export const ROW_GRID = "grid grid-cols-1 gap-6 border-b border-[#cecece] p-6 last:border-b-0 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)_288px]";

type AuctionListItemProps = {
    auction: PublicAuction;
    paddleNumber?: string;
    eligibility: BidderEligibility;
    onRegistered: (auctionUuid: string, paddleNumber: string) => void;
};

export function AuctionListItem({ auction, paddleNumber, eligibility, onRegistered }: AuctionListItemProps) {
    const countdown = countdownFor(auction);
    const isPast = !countdown;

    return (
        <article className={ROW_GRID}>
            <div className="flex h-52.5 w-full items-center justify-center overflow-hidden bg-white">
                {auction.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={auction.coverImageUrl} alt={auction.title} className="h-full w-full object-contain" />
                ) : (
                    <ImageOff className="size-6 text-[#cecece]" />
                )}
            </div>

            <div className="min-w-0">
                <StatusBadge label={STOREFRONT_STATUS_LABELS[auction.status] ?? auction.status} tone={badgeTone(auction)} />
                <h3 className="mt-3.5 text-[20px] leading-7 font-medium tracking-tight text-[#0d0d0d]">
                    <Link href={auctionHref(auction)} className="hover:underline">
                        {auction.title}
                    </Link>
                </h3>
                <p className={cn(EYEBROW, "mt-2")}>{auctionMeta(auction)}</p>
                <RichTextContent html={auction.short_description} className={cn(BODY, "mt-4 [&_p+p]:mt-2")} />
            </div>

            <div className="flex flex-col gap-6 md:col-span-2 lg:col-span-1 lg:justify-between">
                {countdown ? <AuctionCountdown label={countdown.label} target={countdown.target} className="lg:justify-end" /> : <span className="hidden lg:block" />}
                <div className="flex flex-col gap-2">
                    {!isPast && <RegisterToBidButton auction={auction} paddleNumber={paddleNumber} eligibility={eligibility} onRegistered={onRegistered} />}
                    <Link href={auctionHref(auction)} className={cn(BUTTON, BUTTON_OUTLINE)}>
                        {isPast ? "View results" : "Browse"}
                    </Link>
                </div>
            </div>
        </article>
    );
}
