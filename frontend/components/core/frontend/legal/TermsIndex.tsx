"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

// a section becomes current once its heading passes this far down the screen (a little above the middle)
const ACTIVE_LINE = 0.4

const pad = (n: number) => String(n).padStart(2, "0")

/** "On this page": jumps to each section and marks the one being read as you scroll. */
export function TermsIndex({ sections }: { sections: { id: string; title: string }[] }) {
    const [activeId, setActiveId] = useState(sections[0]?.id ?? "")

    useEffect(() => {
        let frame = 0

        const update = () => {
            frame = 0
            const line = window.innerHeight * ACTIVE_LINE
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2

            // the last section whose top has passed the line; at the very bottom, the last section
            // (a short final section may never reach the line)
            let current = sections[0]?.id ?? ""
            for (const { id } of sections) {
                const top = document.getElementById(id)?.getBoundingClientRect().top
                if (top !== undefined && top <= line) current = id
            }
            if (atBottom && sections.length > 0) current = sections[sections.length - 1].id

            setActiveId(current)
        }

        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update)
        }

        update()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
        }
    }, [sections])

    return (
        <nav aria-label="On this page" className="self-start lg:sticky lg:top-28">
            <p className="border-b border-[#cecece] pb-4 text-[10px] leading-3.5 font-medium tracking-[0.2em] text-[#0d0d0d] uppercase">
                On this page
            </p>
            <ol>
                {sections.map((section, index) => {
                    const active = section.id === activeId
                    return (
                        <li key={section.id} className="border-b border-[#cecece]">
                            <a
                                href={`#${section.id}`}
                                aria-current={active ? "location" : undefined}
                                className={cn(
                                    "flex gap-4 py-4 text-[12px] leading-4 transition-colors duration-200",
                                    active ? "font-medium text-[#0d0d0d]" : "text-[#717171] hover:text-[#0d0d0d]",
                                )}
                            >
                                <span className="tabular-nums">{pad(index + 1)}</span>
                                {section.title}
                            </a>
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
