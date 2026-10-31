import { AUCTION_EMAIL } from "@/lib/constants/site-text";
import { cn } from "@/lib/utils";

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, Breadcrumb, EYEBROW, PAGE_MAIN, PAGE_TITLE } from "../storefront";
import { FaqAccordion } from "./FaqAccordion";
import { FAQ_INTRO, FAQ_SECTIONS, FAQ_TITLE } from "./faqContent";
import { TermsIndex } from "./TermsIndex";

// same frame as /terms: intro on a hairline, then an "On this page" index | 760px of questions
const pad = (n: number) => String(n).padStart(2, "0");

const INDEX = FAQ_SECTIONS.map(({ id, title }) => ({ id, title }));

export function FaqPage() {
    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb auctions={false} crumbs={[{ label: "Help & policies" }, { label: "FAQs" }]} />

                    <div className="border-b border-[#cecece] pt-12 pb-14 md:pt-16 md:pb-16">
                        <p className={EYEBROW}>Help · Buying at Akara</p>
                        <h1 className={cn(PAGE_TITLE, "mt-5 sm:leading-[62.6px]")}>{FAQ_TITLE}</h1>
                        <p className="mt-6 max-w-191.5 text-[15px] leading-7 text-[#717171]">{FAQ_INTRO}</p>
                    </div>
                </div>
            </section>

            <section>
                <div className="page-container grid grid-cols-1 gap-10 lg:grid-cols-[230px_minmax(0,760px)] lg:gap-15.5">
                    <TermsIndex sections={INDEX} />

                    <div className="flex min-w-0 flex-col gap-15">
                        {FAQ_SECTIONS.map((section, index) => (
                            // scroll-mt clears the sticky header when jumping here from the index
                            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-28">
                                <div className="flex items-baseline gap-3.25 pb-3">
                                    <span className="text-[10px] leading-3.75 tracking-[0.16em] text-[#717171]">{pad(index + 1)}</span>
                                    <h2 id={`${section.id}-heading`} className="text-[24px] leading-8 font-medium tracking-tight text-[#0d0d0d]">
                                        {section.title}
                                    </h2>
                                </div>

                                <FaqAccordion items={section.items} />
                            </section>
                        ))}

                        {/* anything the answers don't cover */}
                        <div className="flex flex-col gap-5 border border-[#cecece] bg-[#f4f2ef] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                            <div>
                                <p className="text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">Still have a question?</p>
                                <p className={cn(BODY, "mt-1")}>Our team is happy to help with bidding, payment, shipping or consigning a work.</p>
                            </div>
                            <a href={`mailto:${AUCTION_EMAIL}`} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE, "shrink-0")}>
                                Contact us
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
