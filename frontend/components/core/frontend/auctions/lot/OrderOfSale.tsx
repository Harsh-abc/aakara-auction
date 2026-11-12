"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { PublicLot } from "@/lib/types/publicAuction.types";

import { lotHeading } from "../detail/lotDisplay";
import { Tag } from "./LotTag";
import { isClosedLot, lotNo, upNextLot } from "./lotPageDisplay";

type OrderOfSaleProps = {
  lots: PublicLot[];
  saleClosed: boolean;
  /** shown above the list, inside the panel (the live video) — stays put while the list scrolls */
  media?: ReactNode;
  className?: string;
};

// the lots still to sell, in order — hammered lots drop off, so the lot on the block rises to the top.
// a running order to follow, not a menu: the rows don't link anywhere
export function OrderOfSale({ lots, saleClosed, media, className }: OrderOfSaleProps) {
  const upNext = upNextLot(lots);
  const remaining = lots.filter((lot) => !isClosedLot(lot));
  const stillToCome = remaining.filter((lot) => lot.status !== "ACTIVE").length;

  return (
    // on desktop the column is taken out of flow (absolute, inset-0) so the row height comes from the lot and
    // its bid ladder alone — the list can never run longer than they do. Inside that, the panel is pinned under
    // the sticky site header (h-19 + border) and capped at both the column and the viewport left below it
    <div className={cn("lg:relative", className)}>
      <div className="lg:absolute lg:inset-0">
        <aside className="flex flex-col border border-[#cecece] bg-white lg:sticky lg:top-25 lg:max-h-[min(100%,calc(100dvh-124px))]">
          {media && <div className="shrink-0 border-b border-[#cecece] p-2.5">{media}</div>}

          <div className="flex h-11.25 shrink-0 items-center justify-between border-b border-[#cecece] px-4">
            <h2 className="text-[14px] leading-5 font-medium text-[#0d0d0d]">
              Order of sale
            </h2>
            <span className="text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase">
              {stillToCome} still to come
            </span>
          </div>

          {remaining.length === 0 ? (
            <p className="px-4 py-3 text-[14px] leading-5 text-[#717171]">
              {saleClosed
                ? "This sale has closed."
                : "Every lot has been hammered."}
            </p>
          ) : (
            // the list takes whatever height the panel has left and scrolls past that
            <ol className="relative max-h-152 min-h-0 flex-1 overflow-y-auto overscroll-contain lg:max-h-none">
              {remaining.map((lot) => {
                const live = lot.status === "ACTIVE";
                const next = lot.uuid === upNext?.uuid;

                return (
                  <li
                    key={lot.uuid}
                    aria-current={live ? "true" : undefined}
                    className={cn(
                      "flex items-center border-b px-4",
                      live
                        ? "h-11.75 border-black bg-[#0d0d0d] text-white"
                        : cn("border-[#cecece]", next ? "h-10.75" : "h-10"),
                    )}
                  >
                    <span
                      className={cn(
                        "w-14 shrink-0 text-[11px] leading-[13.2px] tracking-[0.16em] uppercase",
                        live ? "text-white" : "text-[#717171]",
                      )}
                    >
                      {lotNo(lot)}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[14px] leading-5",
                        live ? "font-medium text-white" : "text-[#0d0d0d]",
                      )}
                    >
                      {lotHeading(lot)}
                    </span>
                    {/* the site's own lot tags — the live one outlined so it reads on the black row */}
                    {live && (
                      <Tag tone="live" label="Live" className="ml-2 border border-white/40" />
                    )}
                    {next && (
                      <Tag tone="upcoming" label="Upcoming" className="ml-2" />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
