"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type SearchInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    className?: string;
};

// 46px search field with the Figma magnifier
export function SearchInput({ value, onChange, placeholder, label, className }: SearchInputProps) {
    return (
        <label className={cn("relative flex h-11.5 w-full items-center gap-2 border border-[#cecece] bg-white px-3.75 focus-within:border-[#0d0d0d]", className)}>
            <span className="sr-only">{label}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/search.svg" alt="" width={16} height={16} className="shrink-0" />
            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] leading-[19.5px] text-[#0d0d0d] outline-none placeholder:text-[#717171] [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="-mr-1 shrink-0 cursor-pointer p-1 text-[#717171] hover:text-[#0d0d0d]">
                    <X className="size-3.5" />
                </button>
            )}
        </label>
    );
}
