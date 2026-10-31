"use client"

import { Accordion } from "@base-ui/react/accordion"
import { Plus } from "lucide-react"
import { Fragment } from "react"

import type { FaqBlock, FaqItem } from "./faqContent"

// answer text, the same weight as a terms clause
const ANSWER = "text-[14px] leading-7 text-[#0d0d0d]/80"

// "**bold**" spans in the copy become <strong>
function Inline({ text }: { text: string }) {
    return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 ? (
            <strong key={i} className="font-medium text-[#0d0d0d]">
                {part}
            </strong>
        ) : (
            <Fragment key={i}>{part}</Fragment>
        ),
    )
}

function Block({ block }: { block: FaqBlock }) {
    if (typeof block === "string") {
        return (
            <p>
                <Inline text={block} />
            </p>
        )
    }

    if ("heading" in block) {
        return <h4 className="pt-2 text-[11px] leading-4 font-semibold tracking-[0.12em] text-[#0d0d0d] uppercase">{block.heading}</h4>
    }

    return (
        <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-[#cea25a]">
            {block.list.map((item, i) => (
                <li key={i}>
                    <Inline text={item} />
                </li>
            ))}
        </ul>
    )
}

/** The questions, every answer open to start; each can still be closed. Closed answers stay findable with the browser's find-in-page. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
    return (
        <Accordion.Root multiple defaultValue={items.map((item) => item.question)} className="border-t border-[#cecece]">
            {items.map((item) => (
                <Accordion.Item key={item.question} value={item.question} className="border-b border-[#cecece]">
                    <Accordion.Header>
                        <Accordion.Trigger className="group flex w-full cursor-pointer items-start justify-between gap-6 py-5 text-left text-[16px] leading-6 font-medium tracking-tight text-[#0d0d0d] transition-colors duration-200 hover:text-[#673364] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#673364] data-panel-open:text-[#673364]">
                            {item.question}
                            {/* the plus turns to a cross while the answer is open */}
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-current" aria-hidden>
                                <Plus className="size-3 transition-transform duration-300 group-data-panel-open:rotate-45" strokeWidth={1.5} />
                            </span>
                        </Accordion.Trigger>
                    </Accordion.Header>

                    <Accordion.Panel
                        hiddenUntilFound
                        className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-300 ease-out data-ending-style:h-0 data-starting-style:h-0"
                    >
                        <div className={`${ANSWER} flex flex-col gap-3 pr-11 pb-6`}>
                            {item.answer.map((block, i) => (
                                <Block key={i} block={block} />
                            ))}
                        </div>
                    </Accordion.Panel>
                </Accordion.Item>
            ))}
        </Accordion.Root>
    )
}
