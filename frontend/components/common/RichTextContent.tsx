"use client";

import { useMemo, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";
import { htmlToPlainText, isEmptyHtml, sanitizeHtml } from "@/utils/sanitizeHtml";

const subscribe = () => () => {};

/**
 * Shows saved rich-text HTML. The sanitizer needs the browser's DOMParser, so the
 * server (and hydration) render plain text and the formatted HTML takes over after.
 */
export default function RichTextContent({ html, className }: { html: string | null | undefined; className?: string }) {
    const isClient = useSyncExternalStore(subscribe, () => true, () => false);
    const clean = useMemo(() => (isClient ? sanitizeHtml(html) : ""), [html, isClient]);

    if (isEmptyHtml(html)) return null;

    if (!isClient) {
        return <div className={cn("rich-text", className)}>{htmlToPlainText(html)}</div>;
    }

    return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
