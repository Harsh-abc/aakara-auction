"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSelector } from "@/hooks/redux";
import { canAccessDashboard } from "@/lib/constants/roles";

// staff roles (SUPER_ADMIN, ADMIN, AUCTIONEER, STAFF) land on the dashboard instead of the storefront home page
export function StaffHomeRedirect({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const role = useAppSelector((state) => state.auth.role);

    const shouldRedirect = pathname === "/" && canAccessDashboard(role);

    useEffect(() => {
        if (shouldRedirect) router.replace("/dashboard");
    }, [shouldRedirect, router]);

    // render nothing while redirecting so the storefront never flashes
    if (shouldRedirect) return null;

    return <>{children}</>;
}
