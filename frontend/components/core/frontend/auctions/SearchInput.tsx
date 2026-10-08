"use client"

import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

type SearchInputProps = {
    value: string
    onChange: (value: string) => void
    placeholder: string
    label: string
    className?: string
}

export function SearchInput({ value, onChange, placeholder, label, className }: SearchInputProps) {
    return (
        <label className={cn("relative block w-full", className)}>
            <span className="sr-only">{label}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-neutral-400" />
            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-10 w-full border border-neutral-300 bg-white pr-9 pl-9 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-1 text-neutral-400 hover:text-neutral-900"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </label>
    )
}
