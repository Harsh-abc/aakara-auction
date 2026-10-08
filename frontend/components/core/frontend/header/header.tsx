"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AkaraLogo } from "@/components/core/frontend/akaraLogo";
// import { useAppSelector } from "@/store/store-hooks";
import { joinClassNames } from "@/lib/frontendHelpers";
import { AccountDropdown } from "./nav-dropdown";
import { MenuDrawer } from "./menu-drawer";

export function Header() {
    //   const loginStatus = useAppSelector((shared) => shared.login.loginStatus);
    const loginStatus = "logged-out";
    const currentPath = usePathname();
    const [hasScrolled, setHasScrolled] = useState(false);

    useEffect(() => {
        const checkScroll = () => setHasScrolled(window.scrollY > 4);
        checkScroll();
        window.addEventListener("scroll", checkScroll, { passive: true });
        return () => window.removeEventListener("scroll", checkScroll);
    }, []);

    // After logging in, come back to the page you were on
    const comeBackHere = currentPath && !["/login", "/signup"].includes(currentPath) ? `?next=${encodeURIComponent(currentPath)}` : "";

    return (
        <header
            className={joinClassNames(
                "sticky top-0 z-40 border-b border-[#cecece] bg-white/95 backdrop-blur transition-shadow duration-300 supports-[backdrop-filter]:bg-white/85",
                hasScrolled && "shadow-[0_8px_24px_-18px_rgba(0,0,0,0.25)]",
            )}
        >
            <div className="page-container">
                <div className="mx-auto w-full px-6 flex h-19 items-center justify-between">
                    <AkaraLogo />
                    <div className="flex items-center gap-3">
                        {/* {loginStatus === "logged-in" && <AccountDropdown />} */}
                        {loginStatus === "logged-out" && (
                            <Link
                                href={`/login${comeBackHere}`}
                                className="inline-flex h-11 items-center border border-[#333] px-4 text-[12px] uppercase tracking-[0.12em] text-[#0d0d0d] transition-colors duration-200 hover:border-[#d0a55d] hover:bg-[#fdedd6] sm:px-5"
                            >
                                <span className="hidden sm:inline">Log in / Sign up</span>
                                <span className="sm:hidden">Log in</span>
                            </Link>
                        )}
                        {/* While checking the login, keep the space empty so nothing jumps */}
                        {/* {loginStatus === "checking" && <span aria-hidden className="inline-block h-11 w-10 sm:w-41" />} */}
                        <MenuDrawer />
                    </div>
                </div>
            </div>
        </header>
    );
}
