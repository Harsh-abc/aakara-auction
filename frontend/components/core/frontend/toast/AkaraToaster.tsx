"use client"

import { useEffect, useRef } from "react"
import { MotionConfig, motion } from "framer-motion"
import { AlertTriangle, Check, Info, X, XIcon } from "lucide-react"
import { Toaster, resolveValue, toast, type Toast, type ToastOptions } from "react-hot-toast"

type Variant = "success" | "error" | "warning" | "info" | "loading"

/*
 * Storefront toasts in the site's own language — white frosted glass, a #cecece hairline, square corners,
 * an uppercase eyebrow title — made to feel new through motion: a blur-in spring, one gold light sweep
 * as it lands and a hairline that counts down the time left.
 * Every existing `toast.success()` / `toast.error()` call renders like this; `notify.*` adds titles and variants.
 */

// deep, muted status colours that sit quietly with the site's ink and gold
const ACCENTS: Record<Variant, string> = {
    success: "#2f7a5b", // forest green
    error: "#b23a2e", // brick red
    warning: "#a8701c", // burnt amber
    info: "#0d0d0d", // ink
    loading: "#d0a55d", // Akara gold
}

// "#rrggbb" + alpha → "rgba(…)" for the tinted badge, its border and the light sweep
function tint(hex: string, alpha: number) {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const TITLES: Record<Variant, string> = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Notice",
    loading: "Please wait",
}

const ICONS: Record<Exclude<Variant, "loading">, typeof Check> = {
    success: Check,
    error: X,
    warning: AlertTriangle,
    info: Info,
}

// react-hot-toast has no warning / info types: plain toasts show as info
const VARIANT_BY_TYPE: Record<Exclude<Toast["type"], "custom">, Variant> = {
    success: "success",
    error: "error",
    loading: "loading",
    blank: "info",
}

// react-hot-toast pauses every toast while one is hovered; the countdown hairlines follow along
const pauseListeners = new Set<(paused: boolean) => void>()
const setPaused = (paused: boolean) => pauseListeners.forEach((listener) => listener(paused))

type AkaraToastProps = {
    t: Toast
    variant: Variant
    title: string
    message: React.ReactNode
}

function AkaraToast({ t, variant, title, message }: AkaraToastProps) {
    const accent = ACCENTS[variant]
    const Icon = variant === "loading" ? null : ICONS[variant]
    const timed = variant !== "loading" && Number.isFinite(t.duration)
    const barRef = useRef<HTMLSpanElement>(null)

    // the countdown hairline empties over the toast's lifetime and freezes while toasts are hovered
    useEffect(() => {
        const bar = barRef.current
        if (!bar || !timed) return
        const animation = bar.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
            duration: t.duration,
            easing: "linear",
            fill: "forwards",
        })
        const onPause = (paused: boolean) => (paused ? animation.pause() : animation.play())
        pauseListeners.add(onPause)
        return () => {
            pauseListeners.delete(onPause)
            animation.cancel()
        }
    }, [timed, t.duration])

    return (
        <MotionConfig reducedMotion="user">
            <motion.div
                {...t.ariaProps}
                // rises in from below the corner, slides out to the right
                initial={{ opacity: 0, y: 18, scale: 0.96, filter: "blur(10px)" }}
                animate={
                    t.visible
                        ? { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 380, damping: 32, mass: 0.8 } }
                        : { opacity: 0, x: 24, scale: 0.98, filter: "blur(8px)", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }
                }
                // swipe sideways to dismiss (phones)
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) toast.dismiss(t.id)
                }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                className="pointer-events-auto relative w-[min(380px,calc(100vw-24px))] cursor-grab touch-pan-y overflow-hidden border border-[#cecece] bg-white/85 text-[#0d0d0d] shadow-[0_16px_40px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 select-none active:cursor-grabbing"
            >
                {/* one light sweep in the status colour as the toast lands */}
                <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
                    style={{ background: `linear-gradient(90deg, transparent, ${tint(accent, 0.12)}, transparent)` }}
                    initial={{ x: "-100%" }}
                    animate={{ x: "220%" }}
                    transition={{ duration: 1.1, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                />

                <div className="relative flex items-start gap-3.5 py-3.5 pr-11 pl-3.5">
                    {/* a square badge like the site's tags, faintly tinted with the status colour */}
                    <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center border"
                        style={{ background: tint(accent, 0.07), borderColor: tint(accent, 0.28) }}
                    >
                        {Icon ? (
                            <Icon className="size-3.5" strokeWidth={2} style={{ color: accent }} />
                        ) : (
                            <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-[#cecece]" style={{ borderTopColor: accent }} />
                        )}
                    </span>

                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 pt-0.5 text-[11px] leading-[13.2px] font-medium tracking-[0.16em] uppercase">
                            <span className="size-1.5 shrink-0" style={{ background: accent }} />
                            {title}
                        </p>
                        {message && <p className="mt-1.5 text-[13px] leading-[19.5px] wrap-break-word text-[#717171]">{message}</p>}
                    </div>
                </div>

                <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => toast.dismiss(t.id)}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="absolute top-2.5 right-2.5 flex size-7 cursor-pointer items-center justify-center text-[#717171] transition-colors hover:bg-[#f4f2ef] hover:text-[#0d0d0d]"
                >
                    <XIcon className="size-3.5" />
                </button>

                {timed && (
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[#cecece]/60">
                        <span ref={barRef} className="block h-full origin-left" style={{ background: accent }} />
                    </span>
                )}
            </motion.div>
        </MotionConfig>
    )
}

/** The site-wide toaster: toasts stack in the bottom-right corner, newest at the bottom. */
export function AkaraToaster() {
    return (
        <Toaster
            position="bottom-right"
            gutter={10}
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
