/**
 * ════════════════════════════════════════════════════════════════════
 *  ACCOUNT DROPDOWN  —  the 👤 button in the header when logged in
 * ════════════════════════════════════════════════════════════════════
 *  Follows the client wireframe (logged_in.png):
 *    SIGNED IN AS · name · My profile · My auction gallery · Log out
 *
 *  TO ADD A LINK → copy one of the <DropdownMenu.Item> blocks below.
 *
 *  USED BY:
 *    • components/core/frontend/header/header.tsx
 * ════════════════════════════════════════════════════════════════════
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { joinClassNames } from "@/lib/frontendHelpers";
import type { AuthUser } from "@/lib/types/auth.types";
import { logoutUser } from "@/services/operations/auth.api";

const MENU_ROW = "flex cursor-pointer items-center gap-3 px-5 py-3 text-sm text-[#0d0d0d] outline-none transition-colors data-[highlighted]:bg-[#f5f5f5]";

// pages that need a login — leave them after logging out instead of showing a dead page
const ACCOUNT_PAGES = ["/my-profile", "/dashboard"];

function displayName(user: AuthUser) {
    const fullName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ");
    return user.profile?.displayName || fullName || user.username;
}

export function AccountDropdown() {
    const user = useAppSelector((state) => state.auth.user);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const currentPath = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    if (!user) return null;

    const handleLogOut = async () => {
        await dispatch(logoutUser()); // POST /auth/logout → clears the refresh cookie + Redux auth
        toast.success("You have logged out.");
        if (ACCOUNT_PAGES.some((page) => currentPath.startsWith(page))) router.replace("/");
        else router.refresh();
    };

    return (
        <DropdownMenu.Root modal={false} open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger
                aria-label="Account menu"
                className={joinClassNames(
                    "inline-flex size-10 cursor-pointer items-center justify-center border transition-colors duration-200",
                    isOpen ? "border-[#0d0d0d] bg-[#0d0d0d] text-white" : "border-[#cecece] bg-white text-[#0d0d0d] hover:border-[#0d0d0d]",
                )}
            >
                <UserIcon className="size-4" strokeWidth={1.5} />
            </DropdownMenu.Trigger>

            <AnimatePresence>
                {isOpen && (
                    <DropdownMenu.Portal forceMount>
                        <DropdownMenu.Content asChild forceMount align="end" sideOffset={10}>
                            <motion.div
                                className="z-50 w-72 origin-top-right border border-[#333] bg-white shadow-[0_16px_40px_-20px_rgba(0,0,0,0.35)]"
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="mx-2 border-b border-[#cecece] px-3 py-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#717171]">Signed in as</p>
                                    <p className="mt-1 truncate text-sm font-medium text-[#0d0d0d]">{displayName(user)}</p>
                                </div>
                                <div className="py-1">
                                    <DropdownMenu.Item asChild className={MENU_ROW}>
                                        <Link href="/my-profile">
                                            <UserIcon className="size-4" strokeWidth={1.5} /> My profile
                                        </Link>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item asChild className={MENU_ROW}>
                                        <Link href="/my-profile?tab=gallery">
                                            <Bookmark className="size-4" strokeWidth={1.5} /> My auction gallery
                                        </Link>
                                    </DropdownMenu.Item>
                                </div>
                                <DropdownMenu.Separator className="mx-2 h-px bg-[#cecece]" />
                                <DropdownMenu.Item className={joinClassNames(MENU_ROW, "my-1")} onSelect={handleLogOut}>
                                    <LogOut className="size-4" strokeWidth={1.5} /> Log out
                                </DropdownMenu.Item>
                            </motion.div>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                )}
            </AnimatePresence>
        </DropdownMenu.Root>
    );
}
