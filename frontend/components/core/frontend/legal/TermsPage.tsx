import { cn } from "@/lib/utils";

import { Breadcrumb, EYEBROW, PAGE_MAIN, PAGE_TITLE } from "../storefront";
import { TermsIndex } from "./TermsIndex";
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE, TERMS_UPDATED, type TermsSection } from "./termsContent";

// Figma "Terms and Conditions | Akara": intro on a hairline, then an "On this page" index | 760px of terms
const pad = (n: number) => String(n).padStart(2, "0");

const INDEX = TERMS_SECTIONS.map(({ id, title }) => ({ id, title }));

// clause text, a little softer than headings
const CLAUSE = "text-[14px] leading-7 text-[#0d0d0d]/80";

// the left column every row lines up on: term name or clause number
const ROW = "grid grid-cols-1 gap-4 border-b border-[#cecece] py-6 sm:grid-cols-[100px_minmax(0,1fr)] sm:gap-10";

const ITEM_LETTERS = "abcdefghijklmnopqrstuvwxyz";

// a clause's (a), (b), ... sub-items
function SubItems({ items }: { items: string[] }) {
    return (
        <ol className="mt-1">
            {items.map((item, i) => (
                <li key={i} className="flex gap-2">
                    <span className="w-5.25 shrink-0">({ITEM_LETTERS[i]})</span>
                    <span>{item}</span>
                </li>
            ))}
        </ol>
    );
}

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
                    {section.items.map((item, i) =>
                        item.term ? (
                            <div key={i} className={cn(ROW, "py-7")}>
                                <dt className="pt-1.25 text-[11px] leading-4 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">{item.term}</dt>
                                <dd className={CLAUSE}>
                                    {item.text}
                                    {item.list && <SubItems items={item.list} />}
                                </dd>
                            </div>
                        ) : (
                            // untitled row (the rules of interpretation): full width, no term column
                            <div key={i} className={cn(CLAUSE, "border-b border-[#cecece] py-7")}>
                                <p>{item.text}</p>
                                {item.list && <SubItems items={item.list} />}
                            </div>
                        ),
                    )}
                </dl>
            ) : (
                <ol>
                    {section.items.map((clause, i) => (
                        <li key={i} className={ROW}>
                            <span className="pt-1.25 text-[10px] leading-3.75 font-medium tracking-[0.14em] text-[#717171]" aria-hidden>
                                {pad(i + 1)}
                            </span>
                            <div className={CLAUSE}>
                                <p>
                                    {clause.title && <span className="font-medium text-[#0d0d0d]">{clause.title} </span>}
                                    {clause.text}
                                </p>
                                {clause.items && <SubItems items={clause.items} />}
                                {clause.after?.map((paragraph, j) => (
                                    <p key={j} className="mt-3">
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

export function TermsPage() {
    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb auctions={false} crumbs={[{ label: "Help & policies" }, { label: "Terms & conditions" }]} />

                    <div className="border-b border-[#cecece] pt-12 pb-14 md:pt-16 md:pb-16">
                        <p className={EYEBROW}>Legal · Updated {TERMS_UPDATED}</p>
                        <h1 className={cn(PAGE_TITLE, "mt-5 sm:leading-[62.6px]")}>{TERMS_TITLE}</h1>
                        <p className="mt-6 max-w-191.5 text-[15px] leading-7 text-[#717171]">{TERMS_INTRO}</p>
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
    );
}
