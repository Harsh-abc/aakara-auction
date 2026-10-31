// Figma "Terms and Conditions | Akara" — the copy for /terms, kept apart from the layout so it can be edited
// (or later fetched) without touching the page. The text itself is Akara's Terms and Conditions of Sale
// (lib/constants/termsOfSale.ts), the same document bidders accept in the register-to-bid dialog.

import { TERMS_OF_SALE, type TermsClause } from "@/lib/constants/termsOfSale";

export const TERMS_UPDATED = "31 October 2026";

export const TERMS_TITLE = "Terms and conditions of sale";

export const TERMS_INTRO = TERMS_OF_SALE.notice;

export type TermsSection =
    | { id: string; title: string; kind: "definitions"; items: { term: string; text: string; list?: string[] }[] }
    | { id: string; title: string; kind: "clauses"; items: TermsClause[] };

const slug = (heading: string) =>
    heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

export const TERMS_SECTIONS: TermsSection[] = TERMS_OF_SALE.sections.map((section) => {
    const id = slug(section.heading);

    // clause 1: 1.1's defined terms, then 1.2's rules of interpretation as one more, untitled row
    if (section.clauses.some((clause) => clause.definitions)) {
        return {
            id,
            title: section.heading,
            kind: "definitions",
            items: section.clauses.flatMap((clause) =>
                clause.definitions
                    ? [
                          // 1.1's intro line, as an untitled row ahead of the defined terms
                          ...(clause.text ? [{ term: "", text: clause.text }] : []),
                          ...clause.definitions.map(([term, text]) => ({ term, text })),
                      ]
                    : [{ term: "", text: clause.text ?? "", list: clause.items }],
            ),
        };
    }

    return { id, title: section.heading, kind: "clauses", items: section.clauses };
});
