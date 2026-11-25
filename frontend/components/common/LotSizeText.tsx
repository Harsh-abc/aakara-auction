import RichTextContent from "./RichTextContent";

type LotSizeTextProps = {
    /** from lotSizeParts / sizeSetsParts */
    parts: { size: string | null; extraMeasurement: string | null } | null;
    className?: string;
};

/**
 * "22 × 30 in (56 × 76.5 cm) | <extra measurement>" — the extra measurement keeps its
 * rich-text formatting (bold, colour, links). Paragraphs run inline after the bar.
 * Renders a <div>: don't put it inside a <p>.
 */
export default function LotSizeText({ parts, className }: LotSizeTextProps) {
    if (!parts) return null;
    const { size, extraMeasurement } = parts;

    return (
        <div className={className}>
            {size}
            {size && extraMeasurement && " | "}
            {extraMeasurement && (
                <RichTextContent
                    html={extraMeasurement}
                    className="inline [&_p]:inline [&_p+p]:before:content-['_']"
                />
            )}
        </div>
    );
}
