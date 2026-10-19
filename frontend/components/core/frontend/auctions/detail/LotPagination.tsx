import { cn } from "@/lib/utils";

import { EYEBROW } from "../../storefront";

// how many numbered pages sit together before the "…" jump to the last (or after the first)
const RUN = 4;

// ‹ 01 02 03 04 … 07 ›  near the start, 01 … 04 05 06 07 near the end, 01 … 04 05 06 … 12 in between
function pageItems(page: number, totalPages: number): (number | "gap")[] {
    const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

    if (totalPages <= RUN + 2) return range(1, totalPages);

    const shown = page < RUN ? [...range(1, RUN), totalPages] : page > totalPages - RUN + 1 ? [1, ...range(totalPages - RUN + 1, totalPages)] : [1, page - 1, page, page + 1, totalPages];

    // "…" only where it hides two or more pages — a single missing page is shown instead
    return shown.flatMap((p, i): (number | "gap")[] => {
        const gap = i > 0 ? p - shown[i - 1] - 1 : 0;
        if (gap === 1) return [p - 1, p];
        return gap > 1 ? ["gap", p] : [p];
    });
}

const pad = (value: number) => String(value).padStart(2, "0");

// Figma pager: 34px squares on a hairline, the current page filled
const PAGE_BUTTON = "inline-flex h-8.5 min-w-9 cursor-pointer items-center justify-center border border-[#cecece] px-2.75 text-[12px] leading-4 tabular-nums transition-colors duration-200";

type LotPaginationProps = {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
};

export function LotPagination({ page, totalPages, total, limit, onPageChange }: LotPaginationProps) {
    if (total === 0) return null;

    const first = (page - 1) * limit + 1;
    const last = Math.min(page * limit, total);
    const arrow = cn(PAGE_BUTTON, "bg-white text-[#0d0d0d] not-disabled:hover:border-[#0d0d0d] disabled:cursor-not-allowed disabled:opacity-40");

    return (
        <nav aria-label="Lot pages" className="flex flex-col items-center gap-4">
            {totalPages > 1 && (
                <div className="flex items-center gap-2">
                    <button type="button" className={arrow} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
                        ‹
                    </button>
                    {pageItems(page, totalPages).map((item, index) =>
                        item === "gap" ? (
                            <span key={`gap-${index}`} className="px-0.5 text-[12px] leading-4 text-[#717171]" aria-hidden>
                                …
                            </span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                onClick={() => onPageChange(item)}
                                aria-label={`Page ${item}`}
                                aria-current={item === page ? "page" : undefined}
                                className={cn(PAGE_BUTTON, item === page ? "border-[#0d0d0d] bg-[#0d0d0d] text-white" : "bg-white text-[#0d0d0d] hover:border-[#0d0d0d]")}
                            >
                                {pad(item)}
                            </button>
                        ),
                    )}
                    <button type="button" className={arrow} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
                        ›
                    </button>
                </div>
            )}
            <p className={EYEBROW}>
                Lots {first}–{last} of {total}
            </p>
        </nav>
    );
}
