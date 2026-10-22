import { cn } from "@/lib/utils"

import { Breadcrumb, EYEBROW, PAGE_MAIN, PAGE_TITLE } from "../storefront"
import { TermsIndex } from "./TermsIndex"
import { TERMS_SECTIONS, TERMS_UPDATED, type TermsSection } from "./termsContent"

// Figma "Terms and Conditions | Akara": intro on a hairline, then an "On this page" index | 760px of terms
const pad = (n: number) => String(n).padStart(2, "0")

const INDEX = TERMS_SECTIONS.map(({ id, title }) => ({ id, title }))

// clause text, a little softer than headings
const CLAUSE = "text-[14px] leading-7 text-[#0d0d0d]/80"

// the left column every row lines up on: term name or clause number
const ROW = "grid grid-cols-1 gap-2 border-b border-[#cecece] py-6 sm:grid-cols-[100px_minmax(0,1fr)] sm:gap-5"

function SectionBlock({ section, index }: { section: TermsSection; index: number }) {
    return (
        // scroll-mt clears the sticky header when jumping here from the index
        <section id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-28">
            <div className="flex items-baseline gap-3.25 border-b border-[#0d0d0d] pb-3">
                <span className="text-[10px] leading-3.75 tracking-[0.16em] text-[#717171]">{pad(index + 1)}</span>
                <h2 id={`${section.id}-heading`} className="text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">
                    {section.title}
                </h2>
            </div>

            {section.kind === "definitions" ? (
                <dl>
                    {section.items.map((item) => (
                        <div key={item.term} className={cn(ROW, "py-7")}>
                            <dt className="pt-1.25 text-[11px] leading-4 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">{item.term}</dt>
                            <dd className={CLAUSE}>
                                {item.text}
                                {item.list && (
                                    <ol className="mt-1 list-decimal pl-5.25">
                                        {item.list.map((entry) => (
                                            <li key={entry}>{entry}</li>
                                        ))}
                                    </ol>
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <ol>
                    {section.items.map((clause, i) => (
                        <li key={i} className={ROW}>
                            <span className="pt-1.25 text-[10px] leading-3.75 font-medium tracking-[0.14em] text-[#717171]" aria-hidden>
                                {pad(i + 1)}
                            </span>
                            <p className={CLAUSE}>{clause}</p>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    )
}

export function TermsPage() {
    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb auctions={false} crumbs={[{ label: "Help & policies" }, { label: "Terms & conditions" }]} />

                    <div className="border-b border-[#cecece] pt-12 pb-14 md:pt-16 md:pb-16">
                        <p className={EYEBROW}>Legal · Updated {TERMS_UPDATED}</p>
                        <h1 className={cn(PAGE_TITLE, "mt-5 sm:leading-[62.6px]")}>Terms and conditions for sale</h1>
                        <p className="mt-6 max-w-191.5 text-[15px] leading-7 text-[#717171]">
                            These terms and conditions are applicable only to the sale of fixed-price Objects on the Akara site and not to auction
                            works. For terms and conditions related to specific auctions, please check the conditions for sale for that auction.
                            For terms and conditions related to the sale of immoveable property (i.e. real estate), please check the{" "}
                            <span className="text-[#0d0d0d] underline underline-offset-2">conditions in sale</span> in the Prime Properties
                            section of the website.
                        </p>
                    </div>
                </div>
            </section>

            <section>
                {/* "On this page" | the terms (the index stays in view while reading on wide screens) */}
                <div className="page-container grid grid-cols-1 gap-10 lg:grid-cols-[230px_minmax(0,760px)] lg:gap-15.5">
                    <TermsIndex sections={INDEX} />

                    <div className="flex min-w-0 flex-col gap-15">
                        {TERMS_SECTIONS.map((section, index) => (
                            <SectionBlock key={section.id} section={section} index={index} />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    )
}
