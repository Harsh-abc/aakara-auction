/**
 * ════════════════════════════════════════════════════════════════════
 *  ACCOUNT DROPDOWN  —  the 👤 button in the header when logged in
 * ════════════════════════════════════════════════════════════════════
 *  Follows the client wireframe (logged_in.png):
 *    SIGNED IN AS · name · My profile · My auction gallery · Log out
 *
 *  TO ADD A LINK → copy one of the <DropdownMenu.Item> blocks below.
 *
 *  USED BY (updated automatically by `npm run docs:usage`):
 *    • components/site-layout/site-header.tsx
 * ════════════════════════════════════════════════════════════════════
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { joinClassNames } from "@/lib/frontendHelpers";

const MENU_ROW = "flex cursor-pointer items-center gap-3 px-5 py-3 text-sm text-ink outline-none transition-colors data-[highlighted]:bg-cloud";

export function AccountDropdown() {
    // const user = useAppSelector((shared) => shared.login.user);
    // const dispatch = useAppDispatch();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    // if (!user) return null;

    const handleLogOut = async () => {
        // await dispatch(logOutUser());
        toast.success("You have logged out.");
        router.refresh(); // account pages notice and send the visitor home
    };

    return (
        <DropdownMenu.Root modal={false} open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger
                aria-label="Account menu"
                className={joinClassNames(
                    "inline-flex size-10 items-center justify-center border transition-colors duration-200",
                    isOpen ? "border-black bg-black text-white" : "border-ash bg-white text-ink hover:border-ink",
                )}
            >
                <UserIcon className="size-4" strokeWidth={1.5} />
            </DropdownMenu.Trigger>

            <AnimatePresence>
                {isOpen && (
                    <DropdownMenu.Portal forceMount>
                        <DropdownMenu.Content asChild forceMount align="end" sideOffset={10}>
                            <motion.div
                                className="z-50 w-72 origin-top-right border border-ink bg-white shadow-[0_16px_40px_-20px_rgba(0,0,0,0.35)]"
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="border-b border-divider px-5 py-4">
                                    <p className="caption-text">Signed in as</p>
                                    <p className="mt-1 text-sm text-ink">
                                        {/* {user.firstName} {user.lastName} */}
                                        James
                                    </p>
                                </div>
                                <div className="py-1">
                                    <DropdownMenu.Item asChild className={MENU_ROW}>
                                        <Link href="/account/profile">
                                            <UserIcon className="size-4" strokeWidth={1.5} /> My profile
                                        </Link>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item asChild className={MENU_ROW}>
                                        <Link href="/account/kyc">
                                            <ShieldCheck className="size-4" strokeWidth={1.5} /> Identity (KYC)
                                            {/* {user.kycStatus !== "verified" && <span className="ml-auto size-1.5 rounded-full bg-gold" aria-label="needs attention" />} */}
                                            <span className="ml-auto size-1.5 rounded-full bg-gold" aria-label="needs attention" />
                                        </Link>
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item asChild className={MENU_ROW}>
                                        <Link href="/account/gallery">
                                            <Bookmark className="size-4" strokeWidth={1.5} /> My auction gallery
                                        </Link>
                                    </DropdownMenu.Item>
                                </div>
                                <DropdownMenu.Separator className="h-px bg-divider" />
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
