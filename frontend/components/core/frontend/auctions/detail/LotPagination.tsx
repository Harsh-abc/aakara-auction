import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

// 1 … 4 5 6 … 12 — first, last, and the current page's neighbours
function pageItems(page: number, totalPages: number): (number | "gap")[] {
    const pages = new Set([1, totalPages, page - 1, page, page + 1])
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

    const items: (number | "gap")[] = []
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) items.push("gap")
        items.push(p)
    })
    return items
}

const pad = (value: number) => String(value).padStart(2, "0")

type LotPaginationProps = {
    page: number
    totalPages: number
    total: number
    limit: number
    onPageChange: (page: number) => void
}

export function LotPagination({ page, totalPages, total, limit, onPageChange }: LotPaginationProps) {
    const first = (page - 1) * limit + 1
    const last = Math.min(page * limit, total)

    const arrow =
        "inline-flex size-8 cursor-pointer items-center justify-center border border-neutral-200 text-neutral-600 hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200"

    return (
        <nav aria-label="Lot pages" className="flex flex-col items-center gap-3">
            {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                    <button type="button" className={arrow} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
                        <ChevronLeft className="size-3.5" />
                    </button>
                    {pageItems(page, totalPages).map((item, index) =>
                        item === "gap" ? (
                            <span key={`gap-${index}`} className="px-1 text-xs text-neutral-400">…</span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                onClick={() => onPageChange(item)}
                                aria-current={item === page ? "page" : undefined}
                                className={cn(
                                    "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center border px-2 text-[11px] tabular-nums",
                                    item === page
                                        ? "border-neutral-950 bg-neutral-950 text-white"
                                        : "border-neutral-200 text-neutral-700 hover:border-neutral-900"
                                )}
                            >
                                {pad(item)}
                            </button>
                        )
                    )}
                    <button type="button" className={arrow} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
                        <ChevronRight className="size-3.5" />
                    </button>
                </div>
            )}
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Lots {first}–{last} of {total}
            </p>
        </nav>
    )
}
