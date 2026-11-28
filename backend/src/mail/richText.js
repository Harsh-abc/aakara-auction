import sanitizeHtml from "sanitize-html";

import { escapeHtml } from "./templates/registrationReceived.js";

// =====================================================================
// Rich text from the dashboard editor (Tiptap) → HTML that is safe to
// send and looks right in email clients.
//
//   1. emailSafeHtml: strict allowlist (only what the editor produces;
//      no scripts, iframes, event handlers or unsafe URLs), then every
//      tag gets inline styles, since Gmail / Outlook ignore stylesheets
//   2. fillMergeTags: {{name}}, {{paddle}}… → the bidder's own values
//   3. htmlToText: the plain-text part of the email
// =====================================================================

// the editor's colours, sizes and alignment — anything else in style="" is dropped
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*[\d.\s,%]+\)$/i, /^[a-z]{3,20}$/i];
const USER_STYLES = {
    "*": { color: COLOR, "background-color": COLOR, "text-align": [/^(left|right|center|justify)$/] },
    span: { "font-size": [/^\d{1,2}(\.\d+)?px$/] },
    img: { width: [/^\d{1,4}px$/] },
    col: { width: [/^\d{1,4}px$/], "min-width": [/^\d{1,4}px$/] },
};

const STRICT = {
    allowedTags: [
        "p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
        "span", "mark", "code", "pre", "blockquote", "ul", "ol", "li", "hr", "a", "img",
        "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
        "*": ["style"],
        a: ["href", "title"],
        img: ["src", "alt", "title", "width", "height", "data-align"],
        mark: ["data-color"],
        ol: ["start"],
        th: ["colspan", "rowspan"],
        td: ["colspan", "rowspan"],
    },
    allowedStyles: USER_STYLES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "http"] },
    allowProtocolRelative: false,
    // an image whose src was refused (javascript:, data:…) is dropped, not left empty
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
    // drop these with their content; anything else not allowed is unwrapped
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "template"],
};

// the email's own look (same type as the templates around it)
const BODY = "font-size:14px; line-height:22px; color:#555555;";
const BASE_STYLES = {
    p: `margin:0 0 16px 0; ${BODY}`,
    h1: "margin:0 0 12px 0; font-size:24px; line-height:32px; font-weight:400; color:#1a1a1a;",
    h2: "margin:0 0 12px 0; font-size:20px; line-height:28px; font-weight:400; color:#1a1a1a;",
    h3: "margin:0 0 10px 0; font-size:17px; line-height:24px; font-weight:600; color:#1a1a1a;",
    h4: "margin:0 0 8px 0; font-size:15px; line-height:22px; font-weight:600; color:#1a1a1a;",
    ul: `margin:0 0 16px 0; padding-left:24px; ${BODY}`,
    ol: `margin:0 0 16px 0; padding-left:24px; ${BODY}`,
    li: "margin:0 0 6px 0;",
    blockquote: "margin:0 0 16px 0; padding:8px 16px; border-left:3px solid #c9a44c; background-color:#faf8f3; font-style:italic; color:#555555;",
    pre: "margin:0 0 16px 0; padding:12px 14px; background-color:#f5f5f3; font-family:Consolas, Menlo, monospace; font-size:13px; line-height:19px; color:#1a1a1a; white-space:pre-wrap; word-break:break-word;",
    code: "font-family:Consolas, Menlo, monospace; font-size:13px; background-color:#f5f5f3; padding:1px 4px; color:#1a1a1a;",
    hr: "border:0; border-top:1px solid #e5e4e0; margin:24px 0; height:0;",
    a: "color:#7B2D52; text-decoration:underline;",
    mark: "padding:0 2px; color:inherit;",
    table: `border-collapse:collapse; width:100%; margin:0 0 16px 0; ${BODY}`,
    th: "border:1px solid #e5e4e0; padding:8px 10px; text-align:left; vertical-align:top; background-color:#fbeedc; color:#1a1a1a; font-weight:600;",
    td: "border:1px solid #e5e4e0; padding:8px 10px; text-align:left; vertical-align:top;",
};

const IMAGE_MARGINS = { left: "0 auto 16px 0", right: "0 0 16px auto", center: "0 auto 16px auto" };

// base first, then the editor's own (already allowlisted) colour / size / alignment wins
const withBase = (tagName, attribs, base) => ({
    tagName,
    attribs: { ...attribs, style: [base, attribs.style].filter(Boolean).join(" ") },
});

const STYLED = {
    ...STRICT,
    allowedAttributes: { ...STRICT.allowedAttributes, a: ["href", "title", "target", "rel"] },
    // input is already clean; keep the inline styles we add as they are
    parseStyleAttributes: false,
    allowedStyles: undefined,
    transformTags: {
        ...Object.fromEntries(Object.entries(BASE_STYLES).map(([tag, base]) => [tag, (tagName, attribs) => withBase(tagName, attribs, base)])),
        a: (tagName, attribs) => withBase(tagName, { ...attribs, target: "_blank", rel: "noopener noreferrer" }, BASE_STYLES.a),
        mark: (tagName, attribs) => {
            const color = /^#[0-9a-f]{3,8}$/i.test(attribs["data-color"] ?? "") ? attribs["data-color"] : "#fef08a";
            return withBase(tagName, attribs, `${BASE_STYLES.mark} background-color:${color};`);
        },
        img: (tagName, attribs) => {
            const margin = IMAGE_MARGINS[attribs["data-align"]] ?? IMAGE_MARGINS.center;
            const width = /^\d{1,4}$/.test(attribs.width ?? "") ? `width:${attribs.width}px;` : "";
            const { "data-align": _align, height: _height, ...rest } = attribs;
            return withBase(tagName, rest, `display:block; ${width} max-width:100%; height:auto; border:0; margin:${margin};`);
        },
    },
};

/** Editor HTML → sanitized, inline-styled HTML for the email body. */
export const emailSafeHtml = (html) => {
    const clean = sanitizeHtml(String(html ?? ""), STRICT);
    return (
        sanitizeHtml(clean, STYLED)
            // a paragraph inside a list item / quote / table cell doesn't need its own gap
            .replace(/(<(?:li|td|th|blockquote)\b[^>]*>\s*<p style=")margin:0 0 16px 0;/g, "$1margin:0;")
    );
};

// ── merge tags ───────────────────────────────────────
// the dashboard's "Insert field" menu lists these (frontend AuctionEmails.tsx MERGE_TAGS)
export const MERGE_TAGS = ["name", "firstName", "paddle", "auction", "auctionDate", "auctionLink"];

/** Replaces {{tag}} with the bidder's values (escaped); unknown tags are left as typed. */
export const fillMergeTags = (html, values) =>
    String(html ?? "").replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, tag) =>
        MERGE_TAGS.includes(tag) && values[tag] !== undefined ? escapeHtml(values[tag] ?? "") : match
    );

// ── plain text ───────────────────────────────────────
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
const decode = (text) =>
    text
        .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, entity) => ENTITIES[entity])
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

/** Email HTML → readable plain text (links as "text (url)", lists as "- item"). */
export const htmlToText = (html) =>
    decode(
        String(html ?? "")
            // a paragraph inside a list item or table cell is just its text
            .replace(/<\/p>\s*(?=<\/(li|td|th)>)/gi, "")
            .replace(/<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, (_, href, label) => {
                const text = label.replace(/<[^>]*>/g, "").trim();
                const url = href.replace(/&amp;/g, "&");
                return !text || text === url || `mailto:${text}` === url ? url : `${text} (${url})`;
            })
            .replace(/<img\b[^>]*alt="([^"]+)"[^>]*>/gi, "\n[$1]\n\n")
            .replace(/<li\b[^>]*>/gi, "\n- ")
            .replace(/<hr\b[^>]*>/gi, "\n----------\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/(td|th)>/gi, "\t")
            .replace(/<\/tr>/gi, "\n")
            .replace(/<\/(p|h[1-6]|blockquote|pre|ul|ol|table)>/gi, "\n\n")
            .replace(/<[^>]*>/g, "")
    )
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

/** True when the editor HTML shows nothing (e.g. "<p></p>"). */
export const isEmptyRichText = (html) => !/<img\b/i.test(String(html ?? "")) && htmlToText(emailSafeHtml(html)) === "";
