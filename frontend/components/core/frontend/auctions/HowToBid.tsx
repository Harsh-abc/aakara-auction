import { cn } from "@/lib/utils";

import { BODY, SectionHeading } from "../storefront";

const steps = [
    {
        title: "Register & verify",
        body: "Create an account with your details and upload a valid ID. Verification is usually completed within one business day, ahead of the sale opening.",
    },
    {
        title: "Browse the lots",
        body: "Explore the full catalogue with images, provenance, condition notes and estimates in INR, USD and GBP. Add works to your watchlist for alerts.",
    },
    {
        title: "Place your bid",
        body: "Enter your maximum bid before the lot opens. When the auctioneer calls the hammer, the highest maximum wins at one increment above the next-highest bid. You will be notified instantly if you are outbid or if the lot is yours.",
    },
];

export function HowToBid() {
    return (
        <section aria-labelledby="how-to-bid-heading">
            <div className="page-container">
                <SectionHeading id="how-to-bid-heading" title="How to bid" />
                <ol className="mt-6 grid grid-cols-1 gap-0 md:grid-cols-3">
                    {steps.map((step, index) => (
                        <li key={step.title} className="bg-white p-4 md:p-6">
                            <span className="text-[11px] leading-[13.2px] font-semibold tracking-[0.16em] text-[#d0a55d] uppercase">Step {String(index + 1).padStart(2, "0")}</span>
                            <h3 className="mt-3 text-[14px] leading-5 font-medium text-[#0d0d0d]">{step.title}</h3>
                            <p className={cn(BODY, "mt-3")}>{step.body}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
