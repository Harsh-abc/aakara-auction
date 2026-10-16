"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { BUTTON, BUTTON_SOLID } from "@/components/core/frontend/storefront"

// Figma "Login and signup flow": 46px boxes on a #cecece hairline, 11px uppercase labels
export const authInputClass =
    "h-11.5 w-full rounded-none border border-[#cecece] bg-white px-3.5 text-[14px] text-[#0d0d0d] outline-none transition-colors placeholder:text-[#717171]/70 focus:border-[#0d0d0d] disabled:cursor-not-allowed disabled:bg-[#f7f7f7] disabled:text-[#717171]"

export const authLabelClass = "mb-3 block text-[11px] leading-[13.2px] tracking-[0.16em] text-[#717171] uppercase"

export const authInputErrorClass = "border-[#cf4533] focus:border-[#cf4533]"

export function AuthFieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null

    return (
        <p id={id} role="alert" className="mt-1.5 text-[12px] leading-4.5 text-[#cf4533]">
            {message}
        </p>
    )
}

type AuthFieldProps = React.ComponentProps<"input"> & {
    id: string
    label: string
    error?: string
}

export function AuthField({ id, label, error, type = "text", className, ...props }: AuthFieldProps) {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === "password"
    const errorId = `${id}-error`

    return (
        <div className={className}>
            <label htmlFor={id} className={authLabelClass}>
                {label}
            </label>

            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={isPassword && showPassword ? "text" : type}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(authInputClass, isPassword && "pr-11", error && authInputErrorClass)}
                    {...props}
                />

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-[#717171] hover:text-[#0d0d0d]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                )}
            </div>

            <AuthFieldError id={errorId} message={error} />
        </div>
    )
}

export function AuthSubmitButton({
    loading,
    loadingText,
    disabled,
    children,
}: {
    loading: boolean
    loadingText: string
    disabled?: boolean
    children: React.ReactNode
}) {
    return (
        <button type="submit" disabled={loading || disabled} className={cn(BUTTON, BUTTON_SOLID, "h-12 text-[14px]")}>
            {loading ? loadingText : children}
        </button>
    )
}
