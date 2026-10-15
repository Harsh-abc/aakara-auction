import { cn } from "@/lib/utils";
import { LOT_ESSAY_BLOCKS, type EssayBlock, type EssayFigure } from "@/lib/constants/lotEssayContent";

// Figma essay type
const HEADING = "text-[16px] leading-6 font-medium text-[#0d0d0d]";
const BODY = "text-[14px] leading-[22.75px] text-[#717171]";
const CAPTION = "mt-3 text-[10px] leading-3.75 tracking-[0.14em] text-[#717171] uppercase";
// the aside's caption is set in title case, not spaced caps (Figma "Letter")
const ASIDE_CAPTION = "mt-2.5 text-[11px] leading-4 text-[#717171] capitalize";

// gap between blocks; a heading sits closer to what it introduces
const blockGap = (block: EssayBlock, previous: EssayBlock | undefined) => {
    if (!previous) return "";
    if (previous.type === "heading") return block.type === "figure" ? "mt-6" : "mt-3.5";
    if (block.type === "quote" || previous.type === "quote") return "mt-10";
    return "mt-9";
};

// the artwork image when there is one, otherwise the Figma hatched placeholder with its label
function Figure({ figure, image, className }: { figure: EssayFigure; image?: string; className?: string }) {
    return (
        <figure className={className}>
            <FigureBox figure={figure} image={image} />
            <figcaption className={CAPTION}>{figure.caption}</figcaption>
        </figure>
    );
}

// just the image box (no caption)
function FigureBox({ figure, image, className }: { figure: EssayFigure; image?: string; className?: string }) {
    return (
        <div className={className}>
            <div
                className={cn(
                    "relative flex w-full items-center justify-center overflow-hidden",
                    figure.aspect,
                    image ? "bg-[#f4f2ef]" : "bg-[repeating-linear-gradient(135deg,#ececec_0px,#ececec_9px,#e0e0e0_9px,#e0e0e0_10px)]",
                )}
            >
                {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={figure.caption} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <span className="border border-[#cecece] bg-white px-3 py-1.5 text-[10px] leading-3.75 tracking-[0.14em] text-[#717171] uppercase">{figure.label}</span>
                )}
            </div>
        </div>
    );
}

// a paragraph with one phrase (a work title) in italics
function Paragraph({ text, italic, className }: { text: string; italic?: string; className?: string }) {
    const at = italic ? text.indexOf(italic) : -1;
    return (
        <p className={cn(BODY, className)}>
            {at < 0 || !italic ? (
                text
            ) : (
                <>
                    {text.slice(0, at)}
                    <em>{italic}</em>
                    {text.slice(at + italic.length)}
                </>
            )}
        </p>
    );
}

/**
 * STATIC catalogue essay for the client demo (Figma: Individual Lot, essay section).
 * Copy comes from LOT_ESSAY_BLOCKS; figures show the lot's own images in turn
 * (`images`), or the hatched placeholder when the lot has none.
 */
export function StaticLotEssay({ images = [] }: { images?: string[] }) {
    let figureIndex = 0;
    const nextImage = () => (images.length ? images[figureIndex++ % images.length] : undefined);

    return (
        <section aria-label="Catalogue essay">
            <div className="page-container">
                <article className="mx-auto max-w-[65%]">
                    {LOT_ESSAY_BLOCKS.map((block, index) => {
                        const gap = blockGap(block, LOT_ESSAY_BLOCKS[index - 1]);

                        switch (block.type) {
                            case "heading":
                                return (
                                    <h2 key={index} className={cn(HEADING, gap)}>
                                        {block.text}
                                    </h2>
                                );
                            case "paragraph":
                                return <Paragraph key={index} text={block.text} italic={block.italic} className={gap} />;
                            case "figure":
                                return <Figure key={index} figure={block.figure} image={nextImage()} className={gap} />;
                            case "aside":
                                return (
                                    // Figma "Letter" aside: a 250px figure with its caption below; the text is centred on the
                                    // image alone (row 1), the caption gets its own row underneath. Phones stack all three.
                                    <figure key={index} className={cn("grid grid-cols-1 sm:grid-cols-[250px_minmax(0,1fr)] sm:gap-x-6", gap)}>
                                        <FigureBox figure={block.figure} image={nextImage()} className="sm:col-start-1 sm:row-start-1" />
                                        <figcaption className={cn(ASIDE_CAPTION, "sm:col-start-1 sm:row-start-2")}>{block.figure.caption}</figcaption>
                                        <div className="mt-6 min-w-0 sm:col-start-2 sm:row-start-1 sm:mt-0 sm:self-center">
                                            <h3 className={HEADING}>{block.heading}</h3>
                                            <Paragraph text={block.text} className="mt-3.5" />
                                        </div>
                                    </figure>
                                );
                            case "quote":
                                return (
                                    <blockquote key={index} className={cn("text-[24px] leading-8 font-light tracking-tight text-[#0d0d0d] md:text-[30px] md:leading-10", gap)}>
                                        “{block.text}”
                                    </blockquote>
                                );
                        }
                    })}
                </article>
            </div>
        </section>
    );
}
