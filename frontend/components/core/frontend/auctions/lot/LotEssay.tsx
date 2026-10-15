import { cn } from "@/lib/utils"

import { LOT_ESSAY, type EssayBlock, type EssayFigure, type EssayText } from "./lotEssayContent"

const BODY = "text-[14px] leading-[22.75px] text-[#717171]"
const HEADING = "text-[16px] leading-6 font-medium text-[#0d0d0d]"

function Text({ text }: { text: EssayText }) {
    return text.map((part, index) => (typeof part === "string" ? part : <em key={index}>{part.em}</em>))
}

function Figure({ figure, src }: { figure: EssayFigure; src: string | null }) {
    return (
        <figure>
            <div className="overflow-hidden bg-[#d2d0d0]" style={{ aspectRatio: figure.aspect }}>
                {src && <img src={src} alt={figure.caption} className="size-full object-cover" loading="lazy" />}
            </div>
            {figure.caption && <figcaption className="mt-3 text-[12px] leading-[17.88px] text-[#717171]">{figure.caption}</figcaption>}
        </figure>
    )
}

// space above a block, from the one before it
function gap(prev: EssayBlock | undefined, block: EssayBlock) {
    if (!prev) return ""
    if (prev.type === "heading") return block.type === "paragraph" ? "mt-3.5" : "mt-8"
    if (prev.type === "quote" || block.type === "quote" || block.type === "aside") return "mt-10"
    return "mt-9"
}

function Block({ block, src }: { block: EssayBlock; src: string | null }) {
    switch (block.type) {
        case "heading":
            return <h3 className={HEADING}>{block.text}</h3>
        case "paragraph":
            return (
                <p className={BODY}>
                    <Text text={block.text} />
                </p>
            )
        case "figure":
            return <Figure figure={block.figure} src={src} />
        case "aside":
            return (
                <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-[309px_minmax(0,1fr)]">
                    <Figure figure={block.figure} src={src} />
                    <div className="sm:pt-10">
                        <h3 className={HEADING}>{block.heading}</h3>
                        <p className={cn(BODY, "mt-4.5")}>
                            <Text text={block.text} />
                        </p>
                    </div>
                </div>
            )
        case "quote":
            return (
                <blockquote className="text-[24px] leading-8 font-light tracking-[-0.75px] text-[#0d0d0d] md:text-[30px] md:leading-[41.25px]">
                    “{block.text}”
                </blockquote>
            )
    }
}

type LotEssayProps = {
    /** the lot's images, lent in turn to figures that have none of their own */
    images: string[]
    blocks?: EssayBlock[]
}

// the lot's catalogue essay — headings, text, figures and a pull quote in a centred reading column
export function LotEssay({ images, blocks = LOT_ESSAY }: LotEssayProps) {
    if (blocks.length === 0) return null

    const hasFigure = (block: EssayBlock) => block.type === "figure" || block.type === "aside"
    const sources = blocks.map((block, index) => {
        if (block.type !== "figure" && block.type !== "aside") return null
        // the nth figure takes the nth image, wrapping round
        const nth = blocks.slice(0, index).filter(hasFigure).length
        return block.figure.imageUrl ?? (images.length > 0 ? images[nth % images.length] : null)
    })

    return (
        <section aria-label="Catalogue essay">
            <div className="page-container">
                <div className="mx-auto max-w-214.5">
                    {blocks.map((block, index) => (
                        <div key={index} className={gap(blocks[index - 1], block)}>
                            <Block block={block} src={sources[index]} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
