import { TERMS_OF_SALE, type TermsClause } from "@/lib/constants/termsOfSale"

const ITEM_LETTERS = "abcdefghijklmnopqrstuvwxyz"

function Clause({ clause }: { clause: TermsClause }) {
    return (
        <div className="flex gap-3">
            <span className="w-8 shrink-0 font-medium text-neutral-950">{clause.no}</span>
            <div className="min-w-0 flex-1 space-y-2">
                {(clause.title || clause.text) && (
                    <p>
                        {clause.title && <span className="font-medium text-neutral-950">{clause.title} </span>}
                        {clause.text}
                    </p>
                )}
                {clause.definitions && (
                    <dl className="space-y-2">
                        {clause.definitions.map(([term, meaning]) => (
                            <div key={term}>
                                <dt className="inline font-medium text-neutral-950">“{term}”</dt> <dd className="inline">{meaning}</dd>
                            </div>
                        ))}
                    </dl>
                )}
                {clause.items && (
                    <ol className="space-y-1.5">
                        {clause.items.map((item, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="w-5 shrink-0">({ITEM_LETTERS[i]})</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ol>
                )}
                {clause.after?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            </div>
        </div>
    )
}

/** Akara's Conditions of Sale, plus the sale's own terms when it has any. */
export function TermsOfSaleDocument({ auctionTerms }: { auctionTerms: string | null }) {
    return (
        <article className="space-y-5 text-xs leading-relaxed text-neutral-700">
            <header className="space-y-2">
                <h3 className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-950">
                    {TERMS_OF_SALE.title}
                </h3>
                <p>{TERMS_OF_SALE.notice}</p>
            </header>

            {TERMS_OF_SALE.sections.map((section) => (
                <section key={section.no} className="space-y-3">
                    <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-950">
                        {section.no}. {section.heading}
                    </h4>
                    {section.clauses.map((clause) => (
                        <Clause key={clause.no} clause={clause} />
                    ))}
                </section>
            ))}

            {auctionTerms && (
                <section className="space-y-3 border-t border-neutral-200 pt-5">
                    <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-950">
                        Additional terms for this sale
                    </h4>
                    <p className="whitespace-pre-line">{auctionTerms}</p>
                </section>
            )}

            <p className="border-t border-neutral-200 pt-3 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                End of terms · Version {TERMS_OF_SALE.version}
            </p>
        </article>
    )
}
