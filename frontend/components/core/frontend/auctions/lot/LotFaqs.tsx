import Link from "next/link"

import { cn } from "@/lib/utils"

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE } from "../../storefront"

export function LotFaqs() {
    return (
        <section aria-labelledby="lot-faqs-heading">
            <div className="page-container">
                {/* Divider sits above the heading (not below it like SectionHeading) */}
                <h2 id="lot-faqs-heading" className="border-t border-[#cecece] pt-6 text-[18px] leading-7 font-medium tracking-tight text-[#0d0d0d]">
                    FAQs
                </h2>

                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className={BODY}>Questions about bidding, the buyer&apos;s premium, shipping or condition reports? Our FAQs cover it all.</p>
                    <Link href="/faq" className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE, "shrink-0")}>
                        Read the FAQs
                    </Link>
                </div>
            </div>
        </section>
    )
}
