import Link from "next/link"

import { cn } from "@/lib/utils"

import { BUTTON, BUTTON_SOLID } from "./BidButtons"

export const LOT_PAGE = "mx-auto w-full max-w-6xl px-4 pt-8 pb-18 md:px-6"

export type Crumb = { label: string; href?: string }

// Home › Auctions › …crumbs
export function LotBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
    return (
        <nav aria-label="Breadcrumb" className="text-[11px] leading-[16.5px] tracking-[0.12em] text-[#717171] uppercase">
            <ol className="flex flex-wrap items-center gap-x-2">
                {[{ label: "Home", href: "/" }, { label: "Auctions", href: "/auctions" }, ...crumbs].map((crumb, index, all) => (
                    <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                        {index > 0 && <span className="text-[#333]" aria-hidden>›</span>}
                        {crumb.href ? (
                            <Link href={crumb.href} className="hover:text-[#0d0d0d]">{crumb.label}</Link>
                        ) : (
                            <span className="text-[#0d0d0d]" aria-current={index === all.length - 1 ? "page" : undefined}>
                                {crumb.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    )
}

// the lot couldn't be shown — gone, or the request failed
export function LotPageMessage({ auctionUuid, notFound, message }: { auctionUuid: string; notFound: boolean; message?: string }) {
    return (
        <main className={LOT_PAGE}>
            <LotBreadcrumb crumbs={[]} />
            <div className="py-24 text-center">
                <h1 className="text-2xl font-light text-[#0d0d0d]">{notFound ? "Lot not found" : "Couldn't load this lot"}</h1>
                <p className="mx-auto mt-3 max-w-sm text-sm text-[#717171]">
                    {notFound ? "This lot may have been withdrawn, or the link is incorrect." : message}
                </p>
                <Link href={`/auctions/${auctionUuid}`} className={cn(BUTTON, BUTTON_SOLID, "mt-6 w-auto px-6")}>
                    Back to the sale
                </Link>
            </div>
        </main>
    )
}
