import Link from "next/link";

import { cn } from "@/lib/utils";

import { BODY, SectionHeading } from "../storefront";

const steps = [
    {
        title: "Register & verify",
        body: <>Create an account and upload a valid form of identification. Your verification must be approved before you can bid.</>,
    },
    {
        title: "Browse the lots",
        body: (
            <>
                Browse the catalogue for images, provenance, condition notes and estimates in INR. Add lots to{" "}
                <Link href="/my-profile?tab=gallery" className="text-[#0d0d0d] underline underline-offset-2 hover:text-[#673364]">
                    My Gallery
                </Link>{" "}
                to keep track of your selections and receive updates.
            </>
        ),
    },
    {
        title: "Place your bid",
        body: (
            <>
                Enter your maximum bid before the lot closes. The highest bidder at the close of the lot wins. The final price is set at one bidding increment above the next-highest bid, up to your
                maximum bid. You will be notified if you are outbid or win the lot.
            </>
        ),
    },
];

export function HowToBid() {
    return (
        <section id="how-to-bid" aria-labelledby="how-to-bid-heading" className="scroll-mt-24">
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
