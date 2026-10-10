"use client"

import { useMemo } from "react"

import { cn } from "@/lib/utils"
import { isEmptyHtml, sanitizeHtml } from "@/utils/sanitizeHtml"

// the lot's catalogue essay (rich-text description), set as a centred reading column
const ESSAY =
    "mx-auto max-w-168 text-[14px] leading-[22.75px] text-[#717171] " +
    "[&>*:first-child]:mt-0 [&_p]:mt-3.5 [&_a]:underline [&_strong]:font-medium [&_strong]:text-[#0d0d0d] " +
    "[&_:is(h1,h2,h3,h4,h5,h6)]:mt-9 [&_:is(h1,h2,h3,h4,h5,h6)]:mb-3.5 [&_:is(h1,h2,h3,h4,h5,h6)]:text-[16px] [&_:is(h1,h2,h3,h4,h5,h6)]:leading-6 [&_:is(h1,h2,h3,h4,h5,h6)]:font-medium [&_:is(h1,h2,h3,h4,h5,h6)]:text-[#0d0d0d] " +
    "[&_:is(h1,h2,h3,h4,h5,h6)+p]:mt-0 " +
    "[&_blockquote]:my-10 [&_blockquote]:text-[30px] [&_blockquote]:leading-10 [&_blockquote]:font-light [&_blockquote]:tracking-tight [&_blockquote]:text-[#0d0d0d] " +
    "[&_ul]:mt-3.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-3.5 [&_ol]:list-decimal [&_ol]:pl-5 " +
    "[&_hr]:my-9 [&_hr]:border-[#cecece]"

export function LotEssay({ html, className }: { html: string | null; className?: string }) {
    // DOMParser is browser-only; this component renders on the client
    const clean = useMemo(() => (html && !isEmptyHtml(html) ? sanitizeHtml(html) : ""), [html])
    if (!clean) return null

    return (
        <section className={cn("border-t border-[#cecece] pt-12", className)}>
            <div className={ESSAY} dangerouslySetInnerHTML={{ __html: clean }} />
        </section>
    )
}
