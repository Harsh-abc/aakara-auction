"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export const authInputClass =
    "h-12 w-full rounded-none border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 disabled:opacity-60"

export const authLabelClass =
    "mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500"

export const authInputErrorClass = "border-red-600 focus:border-red-600"

export function AuthFieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null

    return (
        <p id={id} role="alert" className="mt-1.5 text-xs text-red-600">
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
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
        <button
            type="submit"
            disabled={loading || disabled}
            className="h-12 w-full cursor-pointer bg-neutral-950 text-xs font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
            {loading ? loadingText : children}
        </button>
    )
}
