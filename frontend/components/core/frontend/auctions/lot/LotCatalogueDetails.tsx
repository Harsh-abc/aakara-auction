"use client"

import { useState } from "react"

import type { PublicLotDetail } from "@/lib/types/publicAuction.types"

import { catalogueSections, type CatalogueSection } from "./lotCatalogue"

function Section({ section }: { section: CatalogueSection }) {
    const [open, setOpen] = useState(section.defaultOpen)

    return (
        <div className="py-4">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
            >
                <span className="text-[16px] leading-6 font-medium text-[#0d0d0d]">{section.title}</span>
                <span className="text-[18px] leading-4.5 text-[#717171]" aria-hidden>
                    {open ? "−" : "+"}
                </span>
            </button>
            {open && (
                <div className="mt-2.5 flex flex-col gap-3 pb-0.5 text-[14px] leading-[22.75px] text-[#717171]">
                    {section.paragraphs.map((paragraph, index) => (
                        <p key={index}>
                            {paragraph.map((line, i) => (
                                <span key={i} className="block">
                                    {line}
                                </span>
                            ))}
                        </p>
                    ))}
                </div>
            )}
        </div>
    )
}

// "Lot details" — description, condition, provenance and exhibitions as an accordion
export function LotCatalogueDetails({ lot, className }: { lot: PublicLotDetail; className?: string }) {
    const sections = catalogueSections(lot)
    if (sections.length === 0) return null

    return (
        <section className={className}>
            <h2 className="pt-6 text-[20px] leading-7 font-medium tracking-tight text-[#0d0d0d]">Lot details</h2>
            <div className="mt-2 divide-y divide-[#cecece]">
                {sections.map((section) => (
                    <Section key={section.title} section={section} />
                ))}
            </div>
        </section>
    )
}
