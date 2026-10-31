"use client";

import Link from "next/link";

import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";

import { BUTTON, BUTTON_INLINE, BUTTON_SOLID } from "../storefront";

/**
 * The coming-soon card's call to action, before any sale is published.
 * Guests are asked to create an account (and come back here); a signed-in visitor already has one and
 * can't register for a sale that isn't open yet, so they see that registration opens with the sale.
 */
export function ComingSoonRegister({ className }: { className?: string }) {
    const signedIn = useAppSelector((state) => Boolean(state.auth.user));

    if (signedIn) {
        return (
            <span aria-disabled="true" className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE, "cursor-default", className)}>
                Auction will be live soon
            </span>
        );
    }

    return (
        // no prefetch: a prefetch made in one session must not be replayed after logging in or out
        <Link href={`/registration?redirect=${encodeURIComponent("/")}`} prefetch={false} className={cn(BUTTON, BUTTON_SOLID, BUTTON_INLINE, className)}>
            Register for Auction
        </Link>
    );
}
