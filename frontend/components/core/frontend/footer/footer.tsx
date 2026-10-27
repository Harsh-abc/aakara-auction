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
import { FOOTER_CONTENT } from "@/lib/constants/site-text";
import { AkaraLogo } from "@/components/core/frontend/akaraLogo";
import { FooterLinks } from "./footer-links";

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
            <div className="page-container mx-auto w-full grid gap-6 py-13 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                <div>
                    <AkaraLogo />
                </div>

                {FOOTER_CONTENT.linkColumns.map((column) => (
                    <div key={column.heading}>
                        <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#717171] mb-3 md:mb-4">{column.heading}</h2>
                        <FooterLinks links={column.links} linkClassName={FOOTER_LINK} />
                    </div>
                ))}

                <div>
                    <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#717171] mb-3 md:mb-4">Contact</h2>
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
                <div className="mx-auto w-full max-w-[1200px] px-6 py-3.5 text-[11px] uppercase tracking-[0.16em]">
                    <p>© Akara {new Date().getFullYear()}</p>
                </div>
            </div>
        </footer>
    );
}
