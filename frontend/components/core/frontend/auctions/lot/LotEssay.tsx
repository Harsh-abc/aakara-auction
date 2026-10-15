import RichTextContent from "@/components/common/RichTextContent"
import { isEmptyHtml } from "@/utils/sanitizeHtml"

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// descriptions saved before the rich-text editor are plain text — one paragraph per line
const toHtml = (description: string) =>
    /<[a-z][^>]*>/i.test(description)
        ? description
        : description
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => `<p>${escapeHtml(line)}</p>`)
              .join("")

// the lot's catalogue essay — the artwork description from the rich-text editor in a centred reading column.
// `.lot-essay` (master.css) sets it in the Figma essay styles: headings, body, figures, asides and pull quotes
export function LotEssay({ description }: { description: string | null | undefined }) {
    if (!description || isEmptyHtml(description)) return null

    return (
        <section aria-label="Catalogue essay">
            <div className="page-container">
                <RichTextContent html={toHtml(description)} className="lot-essay mx-auto max-w-214.5" />
            </div>
        </section>
    )
}
