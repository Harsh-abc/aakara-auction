"use client";

import { useEffect, useRef, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

/*
 * A plain <a> that ignores repeat clicks for a short while. Use it for links that hand off to the
 * browser or OS — mailto: (opens a mail client / Gmail tab), download — where every extra click
 * opens another tab or starts another download.
 *
 * The guard is a ref, not state, so even clicks fired in the same frame are caught; the state only
 * drives the brief "busy" look and aria-disabled.
 */
type CooldownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
    /** how long further clicks are ignored, in ms */
    cooldownMs?: number;
};

export function CooldownLink({ cooldownMs = 2000, onClick, className, children, ...props }: CooldownLinkProps) {
    const lockedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [locked, setLocked] = useState(false);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
        if (lockedRef.current) {
            e.preventDefault();
            return;
        }
        onClick?.(e);
        if (e.defaultPrevented) return;

        lockedRef.current = true;
        setLocked(true);
        timerRef.current = setTimeout(() => {
            lockedRef.current = false;
            setLocked(false);
        }, cooldownMs);
    };

    return (
        <a {...props} onClick={handleClick} aria-disabled={locked || undefined} className={cn(className, locked && "cursor-wait opacity-60")}>
            {children}
        </a>
    );
}
