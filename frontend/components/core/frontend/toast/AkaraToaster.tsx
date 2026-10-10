"use client"

import { XIcon } from "lucide-react"
import { Toaster, resolveValue, toast, type Toast, type ToastOptions } from "react-hot-toast"

import { cn } from "@/lib/utils"

type Variant = "success" | "error" | "warning" | "info"

// green / red / amber, and the storefront maroon (same as the LIVE badge) for info
const DOT_COLORS: Record<Variant, string> = {
    success: "bg-[#2F7A5B]",
    error: "bg-[#C0352B]",
    warning: "bg-[#B7791F]",
    info: "bg-[#7A3D5E]",
}

const TITLES: Record<Variant, string> = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
}

// react-hot-toast has no warning/info types: plain and loading toasts show as info
const VARIANT_BY_TYPE: Record<Exclude<Toast["type"], "custom">, Variant> = {
    success: "success",
    error: "error",
    loading: "info",
    blank: "info",
}

// the storefront header is h-19 (76px); toasts sit just below it
const HEADER_OFFSET = 76 + 12

type AkaraToastProps = {
    t: Toast
    variant: Variant
    title: string
    message: React.ReactNode
}

function AkaraToast({ t, variant, title, message }: AkaraToastProps) {
    return (
        <div
            {...t.ariaProps}
            className={cn(
                "pointer-events-auto relative w-[calc(100vw-32px)] max-w-75 border border-neutral-950 bg-white py-3.5 pl-4 pr-9 text-neutral-950",
                t.visible ? "animate-in fade-in-0 slide-in-from-right-4 duration-200" : "opacity-0 transition-opacity duration-200"
            )}
        >
            <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em]">
                <span className={cn("size-1.5 shrink-0 rounded-full", DOT_COLORS[variant], t.type === "loading" && "animate-pulse")} />
                {title}
            </p>
            {/* pl-4 lines the message up with the title, past the dot */}
            {message && <p className="mt-1.5 pl-4 text-[13px] leading-snug text-neutral-600">{message}</p>}
            <button
                type="button"
                aria-label="Dismiss"
                onClick={() => toast.dismiss(t.id)}
                className="absolute right-2.5 top-2.5 cursor-pointer p-1 text-neutral-950 transition-opacity hover:opacity-60"
            >
                <XIcon className="size-3.5" />
            </button>
        </div>
    )
}

/** Storefront toaster: existing `toast.success()` / `toast.error()` calls render in the Akara style. */
export function AkaraToaster() {
    return (
        <Toaster
            position="top-right"
            gutter={8}
            containerStyle={{ top: HEADER_OFFSET, right: 16 }}
            toastOptions={{ duration: 4000, success: { duration: 4000 }, error: { duration: 5000 } }}
        >
            {(t) => {
                const variant = VARIANT_BY_TYPE[t.type as keyof typeof VARIANT_BY_TYPE] ?? "info"
                return (
                    <AkaraToast
                        t={t}
                        variant={variant}
                        title={t.type === "loading" ? "Please wait" : TITLES[variant]}
                        message={resolveValue(t.message, t)}
                    />
                )
            }}
        </Toaster>
    )
}

type NotifyOptions = Pick<ToastOptions, "id" | "duration"> & { title?: string }

const show =
    (variant: Variant) =>
    (message: React.ReactNode, { title, ...options }: NotifyOptions = {}) =>
        toast.custom((t) => <AkaraToast t={t} variant={variant} title={title ?? TITLES[variant]} message={message} />, options)

/**
 * For a custom title or the warning / info variants, e.g.
 * `notify.error("Invalid email or password.", { title: "Login failed" })`
 */
export const notify = {
    success: show("success"),
    error: show("error"),
    warning: show("warning"),
    info: show("info"),
}
