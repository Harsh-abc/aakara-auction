// ============================================================
// Minimal allowlist sanitizer for rich-text fields
// (auction description, terms) before rendering them as HTML.
// Browser-only: uses DOMParser.
// ============================================================

const ALLOWED_TAGS = new Set([
    "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "MARK", "SPAN", "DIV",
    "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE",
    "A", "HR", "SUB", "SUP", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "COLGROUP", "COL",
    "IMG", "IFRAME",
]);

const ALLOWED_ATTRS = new Set([
    "href", "target", "rel", "colspan", "rowspan",
    "src", "alt", "title", "width", "height", "style",
    "data-align", "data-youtube-video", "allowfullscreen",
]);

const SAFE_URL = /^(https?:|mailto:|tel:|#|\/)/i;
const SAFE_IMAGE_URL = /^(https?:|\/)/i;
// only YouTube embeds (the editor's video button) may be framed
const SAFE_EMBED_URL = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]+/i;

// inline styles the editor writes (color, highlight, font size, alignment, table widths)
const ALLOWED_STYLES = new Set([
    "color", "background-color", "font-size", "text-align", "width", "min-width", "height",
]);
const SAFE_STYLE_VALUE = /^[#\w\s.,%()-]+$/;

const cleanStyle = (style: string) =>
    style
        .split(";")
        .map((declaration) => {
            const [rawName, ...rest] = declaration.split(":");
            const name = rawName?.trim().toLowerCase();
            const value = rest.join(":").trim();
            if (!name || !value || !ALLOWED_STYLES.has(name)) return null;
            if (!SAFE_STYLE_VALUE.test(value) || /url|expression|var\(/i.test(value)) return null;
            return `${name}: ${value}`;
        })
        .filter(Boolean)
        .join("; ");

const clean = (node: Element) => {
    for (const child of Array.from(node.children)) {
        if (!ALLOWED_TAGS.has(child.tagName)) {
            // Drop dangerous containers entirely, unwrap everything else
            if (["SCRIPT", "STYLE", "OBJECT", "EMBED", "TEMPLATE"].includes(child.tagName)) {
                child.remove();
            } else {
                clean(child);
                child.replaceWith(...Array.from(child.childNodes));
            }
            continue;
        }

        const src = child.getAttribute("src")?.trim() ?? "";
        if (
            (child.tagName === "IMG" && !SAFE_IMAGE_URL.test(src)) ||
            (child.tagName === "IFRAME" && !SAFE_EMBED_URL.test(src))
        ) {
            child.remove();
            continue;
        }

        for (const attr of Array.from(child.attributes)) {
            const name = attr.name.toLowerCase();
            if (!ALLOWED_ATTRS.has(name) || (name === "href" && !SAFE_URL.test(attr.value.trim()))) {
                child.removeAttribute(attr.name);
            } else if (name === "style") {
                const style = cleanStyle(attr.value);
                if (style) child.setAttribute("style", style);
                else child.removeAttribute("style");
            }
        }
        if (child.tagName === "A") {
            child.setAttribute("target", "_blank");
            child.setAttribute("rel", "noopener noreferrer");
        }
        if (child.tagName === "IMG") {
            child.setAttribute("loading", "lazy");
        }
        if (child.tagName === "IFRAME") {
            child.setAttribute("loading", "lazy");
            child.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
            child.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups");
        }
        clean(child);
    }
};

export const sanitizeHtml = (html: string | null | undefined): string => {
    if (!html) return "";
    if (typeof DOMParser === "undefined") return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    clean(doc.body);
    return doc.body.innerHTML;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

/**
 * Rich text → one line of plain text, for meta descriptions and inline sentences.
 * Regex-based so it also runs on the server. Older plain-text values pass through unchanged.
 */
export const htmlToPlainText = (html: string | null | undefined): string =>
    (html ?? "")
        .replace(/<(br|\/p|\/li|\/h[1-6]|\/div)\b[^>]*>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, entity: string) => ENTITIES[entity])
        .replace(/\s+/g, " ")
        .trim();

/** True when the rich text has no visible content (e.g. "<p></p>") */
export const isEmptyHtml = (html: string | null | undefined): boolean =>
    !html ||
    (!/<(img|iframe|table|hr)\b/i.test(html) &&
        html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "");
