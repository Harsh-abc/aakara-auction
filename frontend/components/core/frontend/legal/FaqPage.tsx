import { AUCTION_EMAIL } from "@/lib/constants/site-text";
import { cn } from "@/lib/utils";

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, Breadcrumb, EYEBROW, PAGE_MAIN, PAGE_TITLE } from "../storefront";
import { FaqAccordion } from "./FaqAccordion";
import { FAQ_INTRO, FAQ_SECTIONS, FAQ_TITLE } from "./faqContent";

// intro on a hairline, then every question in one full-width list, answers open
const QUESTIONS = FAQ_SECTIONS.flatMap((section) => section.items);

export function FaqPage() {
    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb auctions={false} crumbs={[{ label: "Help & policies" }, { label: "FAQs" }]} />

                    <div className="pt-12 md:pt-16">
                        <p className={EYEBROW}>Help · Buying at Akara</p>
                        <h1 className={cn(PAGE_TITLE, "mt-5 sm:leading-[62.6px]")}>{FAQ_TITLE}</h1>
                        <p className="mt-6 max-w-191.5 text-[15px] leading-7 text-[#717171]">{FAQ_INTRO}</p>
                    </div>
                </div>
            </section>

            <section>
                <div className="page-container">
                    <div className="flex min-w-0 flex-col gap-15">
                        <FaqAccordion items={QUESTIONS} />

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
