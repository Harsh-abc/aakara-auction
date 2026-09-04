"use client";

import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagsInputProps {
    value?: string[];
    onChange?: (tags: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function TagsInput({
    value = [],
    onChange,
    placeholder = "Add tags...",
    disabled = false,
    className,
}: TagsInputProps) {
    const [input, setInput] = useState("");

    const addTag = () => {
        const tag = input.trim();

        if (!tag) return;

        // Prevent duplicate tags
        if (value.includes(tag)) {
            setInput("");
            return;
        }

        onChange?.([...value, tag]);
        setInput("");
    };

    const removeTag = (tagToRemove: string) => {
        onChange?.(
            value.filter((tag) => tag !== tagToRemove)
        );
    };

    const handleKeyDown = (
        event: KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addTag();
        }

        // Remove last tag with Backspace
        if (
            event.key === "Backspace" &&
            !input &&
            value.length > 0
        ) {
            onChange?.(value.slice(0, -1));
        }
    };

    return (
        <div
            className={cn(
                "flex min-h-10 w-full flex-wrap items-center gap-1.5",
                "rounded-md border border-input bg-white px-2 py-1.5",
                "focus-within:border-ring",
                disabled && "cursor-not-allowed opacity-50",
                className
            )}
        >
            {value.map((tag) => (
                <span
                    key={tag}
                    className="
                        inline-flex items-center gap-1
                        rounded-md
                        bg-slate-100
                        px-2 py-1
                        text-sm text-slate-700
                    "
                >
                    {tag}

                    <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        disabled={disabled}
                        className="
                            text-slate-500
                            hover:text-slate-800
                        "
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </span>
            ))}

            <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={
                    value.length === 0 ? placeholder : ""
                }
                className="
                    min-w-[120px]
                    flex-1
                    border-0
                    bg-transparent
                    px-1
                    py-1
                    text-sm
                    outline-none
                    placeholder:text-slate-400
                "
            />
        </div>
    );
}