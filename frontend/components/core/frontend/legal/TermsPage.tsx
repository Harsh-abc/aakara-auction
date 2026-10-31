import { cn } from "@/lib/utils";

import { Breadcrumb, EYEBROW, PAGE_MAIN, PAGE_TITLE } from "../storefront";
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE, TERMS_UPDATED, type TermsSection } from "./termsContent";

// intro, then every section of the terms in one full-width column, numbered as in the document (1, 1.1, 1.2, ...)

// clause text, a little softer than headings
const CLAUSE = "text-[14px] leading-7 text-[#0d0d0d]/80";

// clause number (1.1, 2.3, ...) in the left column
const CLAUSE_NO = "pt-0.5 text-[13px] leading-6 font-medium text-[#717171]";

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

function SectionBlock({ section }: { section: TermsSection }) {
    return (
        // scroll-mt clears the sticky header when jumping here from a #link
        <section id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-28">
            <div className="flex items-baseline gap-3.25 border-b border-[#0d0d0d] pb-3">
                <span className="text-[14px] leading-5 font-medium text-[#717171]">{section.no}.</span>
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
                            // numbered row (1.1's intro, 1.2's rules of interpretation): clause number in the term column
                            <div key={i} className={cn(ROW, "py-7")}>
                                <dt className={CLAUSE_NO}>{item.no}</dt>
                                <dd className={CLAUSE}>
                                    <p>{item.text}</p>
                                    {item.list && <SubItems items={item.list} />}
                                </dd>
                            </div>
                        ),
                    )}
                </dl>
            ) : (
                <ol>
                    {section.items.map((clause, i) => (
                        <li key={i} className={ROW}>
                            <span className={CLAUSE_NO}>{clause.no}</span>
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

                    <div className="pt-12 md:pt-16">
                        <p className={EYEBROW}>Legal · Updated {TERMS_UPDATED}</p>
                        <h1 className={cn(PAGE_TITLE, "mt-5 sm:leading-[62.6px]")}>{TERMS_TITLE}</h1>
                        <p className="mt-6 max-w-191.5 text-[15px] leading-7 text-[#717171]">{TERMS_INTRO}</p>
                    </div>
                </div>
            </section>

            <section>
                <div className="page-container">
                    <div className="flex min-w-0 flex-col gap-15">
                        {TERMS_SECTIONS.map((section) => (
                            <SectionBlock key={section.id} section={section} />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
