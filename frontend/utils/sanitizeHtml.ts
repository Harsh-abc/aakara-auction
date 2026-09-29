// ============================================================
// Minimal allowlist sanitizer for rich-text fields
// (auction description, terms) before rendering them as HTML.
// Browser-only: uses DOMParser.
// ============================================================

const ALLOWED_TAGS = new Set([
    "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "MARK", "SPAN", "DIV",
    "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "CODE",
    "A", "HR", "SUB", "SUP", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
]);

const ALLOWED_ATTRS = new Set(["href", "target", "rel", "colspan", "rowspan"]);

const SAFE_URL = /^(https?:|mailto:|tel:|#|\/)/i;

const clean = (node: Element) => {
    for (const child of Array.from(node.children)) {
        if (!ALLOWED_TAGS.has(child.tagName)) {
            // Drop dangerous containers entirely, unwrap everything else
            if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE"].includes(child.tagName)) {
                child.remove();
            } else {
                clean(child);
                child.replaceWith(...Array.from(child.childNodes));
            }
            continue;
        }

        for (const attr of Array.from(child.attributes)) {
            const name = attr.name.toLowerCase();
            if (!ALLOWED_ATTRS.has(name) || (name === "href" && !SAFE_URL.test(attr.value.trim()))) {
                child.removeAttribute(attr.name);
            }
        }
        if (child.tagName === "A") {
            child.setAttribute("target", "_blank");
            child.setAttribute("rel", "noopener noreferrer");
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

/** True when the rich text has no visible content (e.g. "<p></p>") */
export const isEmptyHtml = (html: string | null | undefined): boolean =>
    !html || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
