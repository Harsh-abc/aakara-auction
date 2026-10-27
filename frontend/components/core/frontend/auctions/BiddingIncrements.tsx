import { Download, Mail } from "lucide-react";

import { AUCTION_EMAIL } from "@/lib/constants/site-text";
import { cn } from "@/lib/utils";

import { BODY, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, BUTTON_SOLID, EYEBROW, SectionHeading } from "../storefront";

/*
 * "Absentee bid / Bidding increments" (client PDF): the printable registration / absentee bids form
 * to download, fill in and email back, and the house increment chart printed on it.
 */

// the registration / absentee bids form (public/downloads)
export const ABSENTEE_FORM_URL = "/downloads/akara-absentee-bids-form.pdf";

// the chart on the form — the same ladder the backend bids on (utils/bidIncrement.js), keep in step with it
const increments: { range: string; step: string; example?: string }[] = [
    { range: "₹5,00,000 – ₹10,00,000", step: "₹50,000" },
    { range: "₹10,00,000 – ₹20,00,000", step: "₹1,00,000" },
    { range: "₹20,00,000 – ₹30,00,000", step: "₹2,00,000" },
    { range: "₹30,00,000 – ₹50,00,000", step: "₹2,00,000, ₹5,00,000, ₹8,00,000", example: "₹32,00,000, ₹35,00,000, ₹38,00,000" },
    { range: "₹50,00,000 – ₹1,00,00,000", step: "₹5,00,000" },
    { range: "₹1,00,00,000 – ₹2,00,00,000", step: "₹10,00,000" },
    { range: "₹2,00,00,000 – ₹3,00,00,000", step: "₹20,00,000" },
    { range: "₹3,00,00,000 – ₹5,00,00,000", step: "₹20,00,000, ₹50,00,000, ₹80,00,000", example: "₹3,20,00,000, ₹3,50,00,000, ₹3,80,00,000" },
    { range: "₹5,00,00,000 – ₹10,00,00,000", step: "₹50,00,000" },
    { range: "₹10,00,00,000 – ₹20,00,00,000", step: "₹1,00,00,000" },
    { range: "₹20,00,00,000 – ₹30,00,00,000", step: "₹2,00,00,000" },
    { range: "₹30,00,00,000 – ₹50,00,00,000", step: "₹2,00,00,000, ₹5,00,00,000, ₹8,00,00,000", example: "₹32,00,00,000, ₹35,00,00,000, ₹38,00,00,000" },
    { range: "₹50,00,00,000 – ₹1,00,00,00,000", step: "₹5,00,00,000" },
];

const LINK = "text-[#0d0d0d] underline underline-offset-2 hover:text-[#673364]";

export function BiddingIncrements() {
    return (
        <section id="absentee-bid" aria-labelledby="absentee-bid-heading" className="scroll-mt-24">
            <div className="page-container">
                <SectionHeading id="absentee-bid-heading" title="Absentee bid / Bidding increments" />

                <div className="mt-6 grid grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
                    {/* the downloadable form */}
                    <div className="h-fit bg-[#f4f2ef] p-4 md:p-6 lg:sticky lg:top-24">
                        <p className={EYEBROW}>Absentee bids</p>
                        <h3 className="mt-3 text-[14px] leading-5 font-medium text-[#0d0d0d]">Registration / Absentee bids form</h3>
                        <p className={cn(BODY, "mt-3")}>
                            If you cannot follow the sale, we can bid on your behalf. Download the form, fill in your details and the maximum bid (hammer price) for each lot, sign it and email it to{" "}
                            <a href={`mailto:${AUCTION_EMAIL}`} className={LINK}>
                                {AUCTION_EMAIL}
                            </a>{" "}
                            before the sale.
                        </p>
                        <p className={cn(BODY, "mt-3")}>We bid for you only as far as needed to win the lot, never above your maximum, and will confirm your bids by email.</p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <a href={ABSENTEE_FORM_URL} download className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE, "gap-2.5")}>
                                <Download className="size-4" strokeWidth={1.5} aria-hidden />
                                Download form
                            </a>
                            <a href={`mailto:${AUCTION_EMAIL}?subject=${encodeURIComponent("Absentee bids form")}`} className={cn(BUTTON, BUTTON_OUTLINE, BUTTON_INLINE, "gap-2.5")}>
                                <Mail className="size-4" strokeWidth={1.5} aria-hidden />
                                Email us
                            </a>
                        </div>
                    </div>

                    {/* the increment chart */}
                    <div className="">
                        <h3 className="text-[14px] leading-5 font-medium text-[#0d0d0d]">Bidding increments</h3>
                        <p className={cn(BODY, "mt-3")}>
                            Bidding begins below the low estimate and rises in increments. The next valid bid follows the chart below. If you leave a proxy bid online, the next bid is placed at the
                            minimum increment.
                        </p>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full min-w-120 text-left text-[14px] leading-5">
                                <thead>
                                    <tr className="border-b border-[#0d0d0d]">
                                        <th scope="col" className={cn(EYEBROW, "py-3 pr-6 font-normal")}>
                                            Current bid
                                        </th>
                                        <th scope="col" className={cn(EYEBROW, "py-3 font-normal")}>
                                            Increment
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {increments.map((row) => (
                                        <tr key={row.range} className="border-b border-[#ececec] align-top">
                                            <td className="py-3 pr-6 whitespace-nowrap text-[#0d0d0d] tabular-nums">{row.range}</td>
                                            <td className="py-3 text-[#0d0d0d] tabular-nums">
                                                {row.step}
                                                {row.example && <span className="mt-1 block text-[12px] leading-4.5 text-[#717171]">e.g. {row.example}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className={cn(BODY, "mt-3 text-[12px] leading-4.5")}>All amounts are hammer prices in Indian rupees. The next valid bid is always shown on the lot page.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
