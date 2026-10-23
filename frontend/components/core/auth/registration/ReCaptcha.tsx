"use client"

import { useEffect, useImperativeHandle, useRef, type Ref } from "react"
import Script from "next/script"

// Google reCAPTCHA v2 "I'm not a robot" checkbox, rendered explicitly so it can be reset after each
// attempt (tokens are single use). The backend checks the token in its recaptcha middleware.

type Grecaptcha = {
    render: (
        container: HTMLElement,
        params: {
            sitekey: string
            callback: (token: string) => void
            "expired-callback": () => void
            "error-callback": () => void
            theme?: "light" | "dark"
            size?: "normal" | "compact"
        }
    ) => number
    reset: (widgetId?: number) => void
    // api.js is a small loader; this runs once the widget code it fetches is ready
    ready: (callback: () => void) => void
}

declare global {
    interface Window {
        grecaptcha?: Grecaptcha
    }
}

const SCRIPT_URL = "https://www.google.com/recaptcha/api.js?render=explicit"

export type ReCaptchaHandle = {
    // clears the checkbox and the token; call after every submit, successful or not
    reset: () => void
}

type ReCaptchaProps = {
    siteKey: string
    onChange: (token: string | null) => void
    onLoadError?: () => void
    ref?: Ref<ReCaptchaHandle>
}

export function ReCaptcha({ siteKey, onChange, onLoadError, ref }: ReCaptchaProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetId = useRef<number | null>(null)

    // the widget keeps the callbacks it was rendered with, so route them through a ref
    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    })

    useImperativeHandle(
        ref,
        () => ({
            reset() {
                if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current)
                onChangeRef.current(null)
            },
        }),
        []
    )

    // next/script loads api.js once per page; onReady fires after that load and again on every
    // mount (e.g. back from the code step via "Edit details"), so each mount renders its own widget
    const renderWidget = () => {
        window.grecaptcha?.ready(() => {
            if (!containerRef.current || widgetId.current !== null) return

            widgetId.current = window.grecaptcha!.render(containerRef.current, {
                sitekey: siteKey,
                theme: "light",
                callback: (token) => onChangeRef.current(token),
                "expired-callback": () => onChangeRef.current(null),
                "error-callback": () => onChangeRef.current(null),
            })
        })
    }

    return (
        <>
            <Script src={SCRIPT_URL} strategy="afterInteractive" onReady={renderWidget} onError={onLoadError} />
            {/* reserve the widget's height so the form doesn't jump when it appears */}
            <div ref={containerRef} className="min-h-19.5" />
        </>
    )
}
