/**
 * Shared storefront building blocks (Figma: "SEP 28 - FOR ABC").
 * Every page is   <main className={PAGE_MAIN}>  →  <section>  →  <div className="page-container">
 * so width, side padding and the vertical rhythm stay the same across the site.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// page rhythm: 48px (52px on md+) above, between and below sections
export const PAGE_MAIN = "flex flex-1 flex-col gap-12 py-12 md:gap-13 md:py-13";

// 11px uppercase metadata (eyebrows, breadcrumbs, counts, meta lines)
export const EYEBROW = "text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase";

// body copy
export const BODY = "text-[14px] leading-[22.75px] text-[#717171]";

// 44px buttons — full width by default; add "w-auto px-4.25" for inline ones
export const BUTTON =
    "inline-flex h-11 w-full cursor-pointer items-center justify-center border text-[12px] leading-4.5 tracking-[0.12em] whitespace-nowrap uppercase transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40";
export const BUTTON_SOLID = "border-black bg-black text-white hover:border-[#673364] hover:bg-[#673364]";
export const BUTTON_OUTLINE = "border-[#0d0d0d] bg-white text-[#0d0d0d] hover:border-[#d0a55d] hover:bg-[#fdedd6]";
export const BUTTON_INLINE = "w-auto px-4.25";

// a section's title row: 18px title on a hairline, optional right-hand note, optional description under it
export function SectionHeading({ id, title, aside, description, className }: { id?: string; title: ReactNode; aside?: ReactNode; description?: ReactNode; className?: string }) {
    return (
        <div className={className}>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-[#cecece] pb-3.25">
                <h2 id={id} className="flex items-baseline gap-2.5 text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">
                    {title}
                </h2>
                {aside && <span className={cn(EYEBROW, "pb-1")}>{aside}</span>}
            </div>
            {description && <p className={cn(BODY, "mt-3")}>{description}</p>}
        </div>
    );
}

export type Crumb = { label: string; href?: string };

// HOME › AUCTIONS › …crumbs  (11px, the current page in ink); account pages leave out AUCTIONS
export function Breadcrumb({ crumbs, auctions = true }: { crumbs: Crumb[]; auctions?: boolean }) {
    const all: Crumb[] = [{ label: "Home", href: "/" }, ...(auctions ? [{ label: "Auctions", href: "/#auctions" }] : []), ...crumbs];
    return (
        <nav aria-label="Breadcrumb" className="text-[11px] leading-[16.5px] tracking-[0.12em] text-[#717171] uppercase">
            <ol className="flex flex-wrap items-center gap-x-2">
                {all.map((crumb, index) => (
                    <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                        {index > 0 && (
                            <span className="text-[#333]" aria-hidden>
                                ›
                            </span>
                        )}
                        {crumb.href && index < all.length - 1 ? (
                            <Link href={crumb.href} className="hover:text-[#0d0d0d]">
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className={index === all.length - 1 ? "text-[#0d0d0d]" : undefined} aria-current={index === all.length - 1 ? "page" : undefined}>
                                {crumb.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

// 48px page title (sale overview, live room, lot page)
export const PAGE_TITLE = "text-[36px] leading-none font-medium tracking-tight text-[#0d0d0d] sm:text-[48px]";
