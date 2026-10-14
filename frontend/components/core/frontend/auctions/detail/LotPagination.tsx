import { cn } from "@/lib/utils";

// 1 … 4 5 6 … 12 — first, last, and the current page's neighbours
function pageItems(page: number, totalPages: number): (number | "gap")[] {
    const pages = new Set([1, totalPages, page - 1, page, page + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    const items: (number | "gap")[] = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) items.push("gap");
        items.push(p);
    });
    return items;
}

const pad = (value: number) => String(value).padStart(2, "0");

// Figma pager: 34px squares on a hairline, the current page filled
const PAGE_BUTTON = "inline-flex h-8.5 min-w-9 cursor-pointer items-center justify-center border border-[#cecece] px-2.75 text-[12px] leading-4 tabular-nums transition-colors duration-200";

type LotPaginationProps = {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

export function LotPagination({ page, totalPages, onPageChange }: LotPaginationProps) {
    if (totalPages <= 1) return null;

    const arrow = cn(PAGE_BUTTON, "bg-white text-[#0d0d0d] hover:border-[#0d0d0d] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#cecece]");

    return (
        <nav aria-label="Lot pages" className="flex items-center justify-center gap-2">
            <button type="button" className={arrow} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
                ‹
            </button>
            {pageItems(page, totalPages).map((item, index) =>
                item === "gap" ? (
                    <span key={`gap-${index}`} className="px-1 text-[12px] leading-4 text-[#717171]">
                        …
                    </span>
                ) : (
                    <button
                        key={item}
                        type="button"
                        onClick={() => onPageChange(item)}
                        aria-current={item === page ? "page" : undefined}
                        className={cn(PAGE_BUTTON, item === page ? "bg-[#0d0d0d] text-white" : "bg-white text-[#0d0d0d] hover:border-[#0d0d0d]")}
                    >
                        {pad(item)}
                    </button>
                ),
            )}
            <button type="button" className={arrow} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
                ›
            </button>
        </nav>
    );
}
