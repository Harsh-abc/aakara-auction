/**
 * ════════════════════════════════════════════════════════════════════
 *  MENU DRAWER  —  the panel that slides in from the right (☰ button)
 * ════════════════════════════════════════════════════════════════════
 *  Follows the client wireframe (menu.png): logo top-left, × top-right,
 *  grey links, the current page in black, "Auction" opens a small sub-menu.
 *
 *  TO CHANGE THE LINKS → constants/site-text.ts → MAIN_MENU_LINKS
 *
 *  ANIMATION: the page dims, the panel glides in, the links appear one after another.
 *
 *  USED BY (updated automatically by `npm run docs:usage`):
 *    • components/site-layout/site-header.tsx
 * ════════════════════════════════════════════════════════════════════
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { MAIN_MENU_LINKS } from "@/lib/constants/site-text";
import { AkaraLogo } from "@/components/core/frontend/akaraLogo";
import { joinClassNames } from "@/lib/frontendHelpers";
import { MenuLink } from "@/lib/types/frontendTypes";
// import type { MenuLink } from "@/lib/types";

const SMOOTH = [0.22, 1, 0.36, 1] as const;

/** Is this menu link the page we're on? */
function isCurrentPage(currentPath: string, link: MenuLink) {
    if (link.href === "/") return currentPath === "/";
    return currentPath.startsWith(link.href.split("?")[0]);
}

export function MenuDrawer() {
    const currentPath = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

    // When the drawer opens, unfold the sub-menu that contains the current page
    useEffect(() => {
        if (isOpen) setOpenSubMenu(MAIN_MENU_LINKS.find((link) => link.children && isCurrentPage(currentPath, link))?.label ?? null);
    }, [isOpen, currentPath]);

    const closeDrawer = () => setIsOpen(false);

    return (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            {/* The ☰ button in the header */}
            <Dialog.Trigger
                aria-label="Open menu"
                className="group inline-flex size-10 shrink-0 flex-col items-center justify-center gap-1.5 border border-[#cecece] bg-white transition-colors hover:border-[#0d0d0d]"
            >
                <span className="h-[1.13px] w-4 bg-[#0d0d0d] transition-transform duration-300" />
                <span className="h-[1.13px] w-4 bg-[#0d0d0d] transition-transform duration-300" />
            </Dialog.Trigger>

            <AnimatePresence>
                {isOpen && (
                    <Dialog.Portal forceMount>
                        <Dialog.Overlay asChild forceMount>
                            <motion.div className="fixed inset-0 z-50 bg-black/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
                        </Dialog.Overlay>
                        <Dialog.Content asChild forceMount>
                            <motion.div
                                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-120 flex-col bg-white focus:outline-none"
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ duration: 0.45, ease: SMOOTH }}
                            >
                                <div className="flex items-center justify-between px-7.5 pt-7.5">
                                    <AkaraLogo />
                                    <Dialog.Close aria-label="Close menu" className="inline-flex size-10 items-center justify-center border border-[#cecece] transition-colors hover:border-[#0d0d0d]">
                                        <X className="size-4" strokeWidth={1.5} />
                                    </Dialog.Close>
                                </div>
                                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                                <Dialog.Description className="sr-only">Website navigation</Dialog.Description>

                                <nav aria-label="Main" className="mt-10 flex-1 overflow-y-auto px-11 pb-10">
                                    <motion.ul className="flex flex-col" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.035, delayChildren: 0.12 } } }}>
                                        {MAIN_MENU_LINKS.map((link) => (
                                            <motion.li key={link.label} variants={{ hidden: { opacity: 0, x: 18 }, visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: SMOOTH } } }}>
                                                {link.children ? (
                                                    <SubMenu
                                                        link={link}
                                                        isActive={isCurrentPage(currentPath, link)}
                                                        isOpen={openSubMenu === link.label}
                                                        onToggle={() => setOpenSubMenu(openSubMenu === link.label ? null : link.label)}
                                                        onLinkClick={closeDrawer}
                                                    />
                                                ) : (
                                                    <Link
                                                        href={link.href}
                                                        onClick={closeDrawer} // also closes when clicking the page you're already on
                                                        aria-current={isCurrentPage(currentPath, link) ? "page" : undefined}
                                                        className={joinClassNames(
                                                            "block py-4 text-[17px] transition-[color,transform] duration-200",
                                                            isCurrentPage(currentPath, link) ? "text-[#0d0d0d]" : "text-[#9a9a9a] hover:text-[#0d0d0d]",
                                                        )}
                                                    >
                                                        {link.label}
                                                    </Link>
                                                )}
                                            </motion.li>
                                        ))}
                                    </motion.ul>
                                </nav>
                            </motion.div>
                        </Dialog.Content>
                    </Dialog.Portal>
                )}
            </AnimatePresence>
        </Dialog.Root>
    );
}

/** A menu item with a small list that folds open (e.g. "Auction") */
function SubMenu({ link, isActive, isOpen, onToggle, onLinkClick }: { link: MenuLink; isActive: boolean; isOpen: boolean; onToggle: () => void; onLinkClick: () => void }) {
    return (
        <>
            <button
                type="button"
                aria-expanded={isOpen}
                onClick={onToggle}
                className={joinClassNames(
                    "flex w-full items-center justify-between py-4 text-left text-[17px] transition-colors cursor-pointer",
                    isActive || isOpen ? "text-[#0d0d0d]" : "text-[#9a9a9a] hover:text-[#0d0d0d]",
                )}
            >
                {link.label}
                <ChevronDown className={joinClassNames("size-3.5 transition-transform duration-300", isOpen && "rotate-180")} strokeWidth={1.5} />
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.ul
                        className="ml-0.5 overflow-hidden border-l border-[#cecece] pl-5"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: SMOOTH }}
                    >
                        {link.children!.map((child) => (
                            <li key={child.label}>
                                <Link href={child.href} onClick={onLinkClick} className="block py-2.5 text-sm text-[#717171] transition-[color,transform] duration-200 hover:text-[#0d0d0d]">
                                    {child.label}
                                </Link>
                            </li>
                        ))}
                        <li className="h-2" aria-hidden />
                    </motion.ul>
                )}
            </AnimatePresence>
        </>
    );
}
