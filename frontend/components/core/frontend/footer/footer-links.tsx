"use client";

import Link from "next/link";
import { useHasPastAuctions } from "@/hooks/useHasPastAuctions";
import type { MenuLink } from "@/lib/types/frontendTypes";

/** One footer column's links — "Past" only appears once a sale has closed */
export function FooterLinks({ links, linkClassName }: { links: MenuLink[]; linkClassName: string }) {
    const hasPast = useHasPastAuctions();

    return (
        <ul className="flex flex-col gap-2">
            {links
                .filter((link) => !link.needsPastAuctions || hasPast)
                .map((link) => (
                    <li key={link.label}>
                        <Link href={link.href} className={linkClassName}>
                            {link.label}
                        </Link>
                    </li>
                ))}
        </ul>
    );
}
