import Link from "next/link"

import { cn } from "@/lib/utils"

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, EYEBROW, SectionHeading } from "../../storefront"

export function LotFaqs() {
    return (
        <section aria-labelledby="lot-faqs-heading">
            <div className="page-container">
                <SectionHeading
                    id="lot-faqs-heading"
                    title={
                        <>
                            <span className={EYEBROW}>Help</span>
                            FAQs
                        </>
                    }
                />

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className={BODY}>Questions about bidding, the buyer&apos;s premium, shipping or condition reports? Our FAQs cover it all.</p>
                    <Link href="/faq" className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE, "shrink-0")}>
                        Read the FAQs
                    </Link>
                </div>
            </div>
        </section>
    )
}
