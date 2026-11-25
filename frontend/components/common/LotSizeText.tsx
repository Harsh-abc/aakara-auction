import RichTextContent from "./RichTextContent";

type LotSizeTextProps = {
    /** from lotSizeParts / sizeSetsParts */
    parts: { size: string | null; extraMeasurement: string | null } | null;
    className?: string;
};

/**
 * The size, then the extra measurement below it with its rich-text formatting (bold, colour,
 * links) — each paragraph its own row, an empty paragraph a blank row:
 *
 *   6.25 × 5 in (16 × 13 cm)
 *   Framed: 10 × 8 in
 *
 * Renders a <div>: don't put it inside a <p>.
 */
export default function LotSizeText({ parts, className }: LotSizeTextProps) {
    if (!parts) return null;
    const { size, extraMeasurement } = parts;

    return (
        <div className={className}>
            {size && <span className="block">{size}</span>}
            {extraMeasurement && (
                // an empty paragraph keeps a line's height, so a blank line in the editor shows as a gap
                <RichTextContent html={extraMeasurement} className="[&_p]:min-h-[1lh]" />
            )}
        </div>
    );
}
