"use client"

import { useEffect } from "react"
import { MotionConfig, motion } from "framer-motion"
import { CircleAlert, CircleCheck, CircleX, TriangleAlert, XIcon } from "lucide-react"
import { Toaster, resolveValue, toast, useToasterStore, type Toast, type ToastOptions } from "react-hot-toast"

type Variant = "success" | "error" | "warning" | "info" | "loading"

// at most this many toasts on screen; older ones are dismissed (with their exit animation) as new ones arrive
const MAX_VISIBLE_TOASTS = 2

// the bottom rule drains from full width to nothing over the toast's lifetime, and pauses while the toasts are
// hovered (react-hot-toast pauses its timers then too)
const PROGRESS_CSS = `
@keyframes akara-toast-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
.akara-toaster:hover .akara-toast-progress { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .akara-toast-progress { animation: none !important; } }
`

/*
 * Storefront toasts: a softly tinted card with square corners, an outlined status icon, a bold coloured
 * title ("Success!", "Notice!") over the message, and a solid status-coloured rule along the bottom.
 * The font is inherited from the storefront (Inter). Every `toast.success()` / `toast.error()` call
 * renders like this; `notify.*` adds titles and variants.
 */

// accent = icon, title and bottom rule; surface = the card's tint
const PALETTE: Record<Variant, { accent: string; surface: string }> = {
    success: { accent: "#2f7a5b", surface: "#eef5f2" }, // green
    error: { accent: "#b23a2e", surface: "#fcefed" }, // brick red
    warning: { accent: "#a8701c", surface: "#fcf4e6" }, // amber
    info: { accent: "#6b2f63", surface: "#fdeafc" }, // plum
    loading: { accent: "#a07a35", surface: "#f8f3ea" }, // Akara gold
}

const TITLES: Record<Variant, string> = {
    success: "Success!",
    error: "Error!",
    warning: "Warning!",
    info: "Notice!",
    loading: "Please wait",
}

const ICONS: Record<Exclude<Variant, "loading">, typeof CircleCheck> = {
    success: CircleCheck,
    error: CircleX,
    warning: TriangleAlert,
    info: CircleAlert,
}

// react-hot-toast has no warning / info types: plain toasts show as info
const VARIANT_BY_TYPE: Record<Exclude<Toast["type"], "custom">, Variant> = {
    success: "success",
    error: "error",
    loading: "loading",
    blank: "info",
}

type AkaraToastProps = {
    t: Toast
    variant: Variant
    title: string
    message: React.ReactNode
}

function AkaraToast({ t, variant, title, message }: AkaraToastProps) {
    const { accent, surface } = PALETTE[variant]
    const Icon = variant === "loading" ? null : ICONS[variant]

    return (
        <MotionConfig reducedMotion="user">
            <motion.div
                {...t.ariaProps}
                // rises in from below the corner, slides out to the right
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={
                    t.visible
                        ? { opacity: 1, x: 0, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 32, mass: 0.8 } }
                        : { opacity: 0, x: 24, scale: 0.98, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }
                }
                // swipe sideways to dismiss (phones)
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) toast.dismiss(t.id)
                }}
                className="pointer-events-auto relative w-[min(420px,calc(100vw-24px))] cursor-grab touch-pan-y overflow-hidden text-[#0d0d0d] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.22)] select-none active:cursor-grabbing"
                style={{ background: surface }}
            >
                {/* status-coloured rule along the bottom: drains over the toast's duration (stays full when it never times out) */}
                <span
                    aria-hidden
                    className="akara-toast-progress absolute inset-x-0 bottom-0 h-0.75 origin-left"
                    style={{
                        background: accent,
                        animation: Number.isFinite(t.duration) && t.duration ? `akara-toast-progress ${t.duration}ms linear forwards` : undefined,
                    }}
                />
                <div className="flex items-center gap-4 py-5 pr-12 pl-5">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center" style={{ color: accent }}>
                        {Icon ? (
                            <Icon className="size-9" strokeWidth={1.75} />
                        ) : (
                            <span className="size-7 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        )}
                    </span>

                    <div className="min-w-0 flex-1">
                        <p className="text-[16px] leading-[22px] font-bold" style={{ color: accent }}>
                            {title}
                        </p>
                        {message && <p className="mt-1 text-[14px] leading-[22px] wrap-break-word text-[#0d0d0d]">{message}</p>}
                    </div>
                </div>

                <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => toast.dismiss(t.id)}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="absolute top-3 right-3 flex size-7 cursor-pointer items-center justify-center text-[#0d0d0d] transition-opacity hover:opacity-60"
                >
                    <XIcon className="size-4" strokeWidth={2} />
                </button>
            </motion.div>
        </MotionConfig>
    )
}

/** The site-wide toaster: toasts stack in the bottom-right corner, newest at the bottom. */
export function AkaraToaster() {
    const { toasts } = useToasterStore()

    // newest first: anything past the cap is the oldest, so dismiss it
    useEffect(() => {
        toasts
            .filter((t) => t.visible)
            .slice(MAX_VISIBLE_TOASTS)
            .forEach((t) => toast.dismiss(t.id))
    }, [toasts])

    return (
        <>
        <style>{PROGRESS_CSS}</style>
        <Toaster
            position="bottom-right"
            gutter={10}
            containerClassName="akara-toaster"
            containerStyle={{ bottom: 16, right: 16 }}
            toastOptions={{ duration: 4000, success: { duration: 4000 }, error: { duration: 5500 } }}
        >
            {(t) => {
                // notify.* toasts already render their own AkaraToast
                if (t.type === "custom") return <>{resolveValue(t.message, t)}</>
                const variant = VARIANT_BY_TYPE[t.type]
                return <AkaraToast t={t} variant={variant} title={TITLES[variant]} message={resolveValue(t.message, t)} />
            }}
        </Toaster>
        </>
    )
}

type NotifyOptions = Pick<ToastOptions, "id" | "duration"> & { title?: string }

const show =
    (variant: Exclude<Variant, "loading">) =>
    (message: React.ReactNode, { title, ...options }: NotifyOptions = {}) =>
        toast.custom((t) => <AkaraToast t={t} variant={variant} title={title ?? TITLES[variant]} message={message} />, {
            duration: variant === "error" ? 5500 : 4000,
            ...options,
        })

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
