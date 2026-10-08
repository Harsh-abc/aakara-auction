"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AkaraLogo } from "@/components/core/frontend/akaraLogo";
import { useAppSelector } from "@/hooks/redux";
import { canAccessDashboard } from "@/lib/constants/roles";
import { joinClassNames } from "@/lib/frontendHelpers";
import { AccountDropdown } from "./nav-dropdown";
import { MenuDrawer } from "./menu-drawer";

export function Header() {
    // auth is restored from storage before anything renders (PersistGate), so no "checking" state is needed
    const isLoggedIn = useAppSelector((state) => !!state.auth.user);
    // staff roles get a shortcut back to /dashboard; BIDDER and USER don't
    const showDashboard = useAppSelector((state) => !!state.auth.user && canAccessDashboard(state.auth.role));
    const currentPath = usePathname();
    const [hasScrolled, setHasScrolled] = useState(false);

    useEffect(() => {
        const checkScroll = () => setHasScrolled(window.scrollY > 4);
        checkScroll();
        window.addEventListener("scroll", checkScroll, { passive: true });
        return () => window.removeEventListener("scroll", checkScroll);
    }, []);

    // After logging in, come back to the page you were on
    const comeBackHere =
        currentPath && !["/login", "/signup", "/registration"].includes(currentPath) ? `?redirect=${encodeURIComponent(currentPath)}` : "";

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
                        {showDashboard && (
                            <Link
                                href="/dashboard"
                                className="inline-flex h-11 items-center border border-[#333] px-4 text-[12px] uppercase tracking-[0.12em] text-[#0d0d0d] transition-colors duration-200 hover:border-[#d0a55d] hover:bg-[#fdedd6] sm:px-5"
                            >
                                Dashboard
                            </Link>
                        )}
                        {isLoggedIn ? (
                            <AccountDropdown />
                        ) : (
                            <Link
                                href={`/registration${comeBackHere}`}
                                className="inline-flex h-11 items-center border border-[#333] px-4 text-[12px] uppercase tracking-[0.12em] text-[#0d0d0d] transition-colors duration-200 hover:border-[#d0a55d] hover:bg-[#fdedd6] sm:px-5"
                            >
                                <span className="hidden sm:inline">Log in / Sign up</span>
                                <span className="sm:hidden">Log in</span>
                            </Link>
                        )}
                        <MenuDrawer />
                    </div>
                </div>
            </div>
        </header>
    );
}
