"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { getWatchAccess, type WatchAccess } from "@/services/operations/liveStream.api";

import { BODY, Breadcrumb, BUTTON, BUTTON_INLINE, BUTTON_OUTLINE, BUTTON_SOLID, PAGE_MAIN } from "../../storefront";

type GateState = { status: "checking" } | { status: "allowed" } | { status: "denied"; access: Pick<WatchAccess, "code" | "message"> } | { status: "error" };

const SIGN_IN: GateState = {
    status: "denied",
    access: { code: "SIGN_IN", message: "Sign in with your bidder account to join the live auction." },
};

/**
 * The live auction room (and its video) is for bidders only: signed-in bidder accounts verified
 * to bid in this sale, plus staff. Everyone else sees why, with a way to sign in or register.
 * The stream itself is enforced by the backend too — this gate only keeps the page honest.
 */
export function LiveRoomGate({ auctionUuid, children }: { auctionUuid: string; children: ReactNode }) {
    const token = useAppSelector((state) => state.auth.accessToken);
    const pathname = usePathname();
    const [state, setState] = useState<GateState>(token ? { status: "checking" } : SIGN_IN);

    // re-checked on sign in / out
    const [checkedFor, setCheckedFor] = useState(token);
    if (checkedFor !== token) {
        setCheckedFor(token);
        setState(token ? { status: "checking" } : SIGN_IN);
    }

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        getWatchAccess(auctionUuid, token)
            .then((access) => {
                if (cancelled) return;
                setState(access.allowed ? { status: "allowed" } : { status: "denied", access });
            })
            .catch(() => !cancelled && setState({ status: "error" }));
        return () => {
            cancelled = true;
        };
    }, [auctionUuid, token]);

    if (state.status === "allowed") return <>{children}</>;

    if (state.status === "checking") {
        return (
            <main className={PAGE_MAIN}>
                <section>
                    <div className="page-container">
                        <Breadcrumb crumbs={[{ label: "Live auction" }]} />
                        <Skeleton className="mt-6 h-8 w-full max-w-sm rounded-none" />
                        <Skeleton className="mt-6 h-100 w-full rounded-none" />
                    </div>
                </section>
            </main>
        );
    }

    const code = state.status === "denied" ? state.access.code : null;
    const message = state.status === "denied" ? state.access.message : "We couldn't check your access to the live auction. Please try again.";

    return (
        <main className={PAGE_MAIN}>
            <section>
                <div className="page-container">
                    <Breadcrumb crumbs={[{ label: "Live auction" }]} />
                    <div className="py-24 text-center">
                        <h1 className="text-[24px] leading-8 font-medium text-[#0d0d0d]">The live auction is for registered bidders</h1>
                        <p className={cn(BODY, "mx-auto mt-3 max-w-md")}>{message}</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {code === "SIGN_IN" && (
                                <Link href={`/registration?redirect=${encodeURIComponent(pathname)}`} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE)}>
                                    Sign in
                                </Link>
                            )}
                            <Link href={`/auctions/${auctionUuid}`} className={cn(BUTTON, code === "SIGN_IN" ? BUTTON_OUTLINE : BUTTON_SOLID, BUTTON_INLINE)}>
                                {code === "REGISTER" ? "Register for this sale" : "Back to the sale"}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
