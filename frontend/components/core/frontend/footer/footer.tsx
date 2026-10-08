/**
 * ════════════════════════════════════════════════════════════════════
 *  SITE FOOTER  —  the bottom of every page (Figma: off-white + plum bar)
 * ════════════════════════════════════════════════════════════════════
 *  TO CHANGE ANY FOOTER TEXT OR LINK → constants/site-text.ts → FOOTER_CONTENT
 *
 *  USED BY (updated automatically by `npm run docs:usage`):
 *    • app/(website)/layout.tsx
 *    • app/not-found.tsx
 * ════════════════════════════════════════════════════════════════════
 */
import Link from "next/link";
import { FOOTER_CONTENT } from "@/lib/constants/site-text";
import { AkaraLogo } from "@/components/core/frontend/akaraLogo";

const FOOTER_LINK = "text-sm text-[#717171] transition-colors duration-200 hover:text-[#0d0d0d]";

/** Turns an email into a mailto: link and a phone number into a tel: link */
function ContactLine({ text }: { text: string }) {
    if (text.includes("@"))
        return (
            <a href={`mailto:${text}`} className={FOOTER_LINK}>
                {text}
            </a>
        );
    if (text.startsWith("+"))
        return (
            <a href={`tel:${text.replace(/\s/g, "")}`} className={FOOTER_LINK}>
                {text}
            </a>
        );
    return <span className="text-sm text-[#717171]">{text}</span>;
}

export function Footer() {
    return (
        <footer className="mt-auto border-t border-[#cecece] bg-[#f4f2ef]">
            <div className="mx-auto w-full max-w-[1200px] px-6 grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                <div className="flex flex-col gap-4">
                    <AkaraLogo />
                    <p className="max-w-66 text-sm leading-relaxed text-[#717171]">{FOOTER_CONTENT.aboutText}</p>
                </div>

                {FOOTER_CONTENT.linkColumns.map((column) => (
                    <div key={column.heading}>
                        <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#717171] mb-4">{column.heading}</h2>
                        <ul className="flex flex-col gap-2">
                            {column.links.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className={FOOTER_LINK}>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                <div>
                    <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#717171] mb-4">Contact</h2>
                    <ul className="flex flex-col gap-2">
                        {FOOTER_CONTENT.contactLines.map((line) => (
                            <li key={line}>
                                <ContactLine text={line} />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Purple bar at the very bottom */}
            <div className="bg-[#673364] text-white">
                <div className="mx-auto w-full max-w-[1200px] px-6 flex flex-col gap-2 py-3.5 text-[11px] uppercase tracking-[0.16em] sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        {FOOTER_CONTENT.legalLinks.map((link, index) => (
                            <span key={link.href}>
                                {index > 0 && <span className="px-1.5">·</span>}
                                <Link href={link.href} className="hover:underline">
                                    {link.label}
                                </Link>
                            </span>
                        ))}
                    </p>
                    <p>© {new Date().getFullYear()} Akara Art</p>
                </div>
            </div>
        </footer>
    );
}
