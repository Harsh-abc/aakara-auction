"use client";

import { cn } from "@/lib/utils";
import type { PublicLot } from "@/lib/types/publicAuction.types";

import { lotHeading } from "../detail/lotDisplay";
import { Tag } from "./LotTag";
import { isClosedLot, lotNo, upNextLot } from "./lotPageDisplay";

type OrderOfSaleProps = {
    lots: PublicLot[];
    saleClosed: boolean;
    className?: string;
};

// the lots still to sell, in order — hammered lots drop off, so the lot on the block rises to the top.
// a running order to follow, not a menu: the rows don't link anywhere
export function OrderOfSale({ lots, saleClosed, className }: OrderOfSaleProps) {
    const upNext = upNextLot(lots);
    const remaining = lots.filter((lot) => !isClosedLot(lot));
    const stillToCome = remaining.filter((lot) => lot.status !== "ACTIVE").length;

    return (
        // pinned under the sticky site header (h-19 + border) while the lot and its ladder scroll by
        <aside className={cn("self-start border border-[#cecece] bg-white lg:sticky lg:top-25", className)}>
            <div className="flex h-11.25 items-center justify-between border-b border-[#cecece] px-4">
                <h2 className="text-[14px] leading-5 font-medium text-[#0d0d0d]">Order of sale</h2>
                <span className="text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">{stillToCome} still to come</span>
            </div>

            {remaining.length === 0 ? (
                <p className="px-4 py-3 text-[14px] leading-5 text-[#717171]">{saleClosed ? "This sale has closed." : "Every lot has been hammered."}</p>
            ) : (
                // ten rows show (live 47px + up next 43px + 8 × 40px), the rest scroll inside the panel
                <ol className="relative max-h-[410px] overflow-y-auto overscroll-contain">
                    {remaining.map((lot) => {
                        const live = lot.status === "ACTIVE";
                        const next = lot.uuid === upNext?.uuid;

                        return (
                            <li
                                key={lot.uuid}
                                aria-current={live ? "true" : undefined}
                                className={cn(
                                    "flex items-center border-b px-4",
                                    live ? "h-11.75 border-black bg-[#0d0d0d] text-white" : cn("border-[#cecece]", next ? "h-10.75" : "h-10"),
                                )}
                            >
                                <span className={cn("w-14 shrink-0 text-[11px] leading-[13.2px] tracking-[0.16em] uppercase", live ? "text-white" : "text-[#717171]")}>{lotNo(lot)}</span>
                                <span className={cn("min-w-0 flex-1 truncate text-[14px] leading-5", live ? "font-medium text-white" : "text-[#0d0d0d]")}>{lotHeading(lot)}</span>
                                {next && <Tag tone="up-next" label="Up next" className="ml-2" />}
                            </li>
                        );
                    })}
                </ol>
            )}
        </aside>
    );
}
