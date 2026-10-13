"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}

export function ToolbarButton({ label, onClick, active, disabled, className, children }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            // keep the editor's selection while clicking toolbar buttons
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded px-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40",
                active && "bg-slate-100 text-slate-900",
                className
            )}
        >
            {children}
        </button>
    );
}

export const ToolbarDivider = () => <div className="mx-1 h-5 w-px shrink-0 bg-slate-200" />;

interface ToolbarDropdownProps {
    label: string;
    trigger: ReactNode;
    active?: boolean;
    disabled?: boolean;
    align?: "left" | "right";
    panelClassName?: string;
    // render prop so a panel can close itself after an action
    children: (close: () => void) => ReactNode;
}

export function ToolbarDropdown({
    label,
    trigger,
    active,
    disabled,
    align = "left",
    panelClassName,
    children,
}: ToolbarDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onMouseDown = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <ToolbarButton label={label} active={active || open} disabled={disabled} onClick={() => setOpen((o) => !o)}>
                {trigger}
                <ChevronDown className="h-3 w-3 opacity-60" />
            </ToolbarButton>

            {open && (
                <div
                    className={cn(
                        "absolute top-full z-40 mt-1 rounded-md border border-slate-200 bg-white p-1 shadow-lg",
                        align === "right" ? "right-0" : "left-0",
                        panelClassName
                    )}
                >
                    {children(() => setOpen(false))}
                </div>
            )}
        </div>
    );
}

// A row inside a dropdown panel
export function MenuItem({
    onClick,
    active,
    children,
}: {
    onClick: () => void;
    active?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn(
                "flex w-full items-center rounded px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100",
                active && "bg-slate-100 font-medium text-slate-900"
            )}
        >
            {children}
        </button>
    );
}

// URL / text field + submit button used by the link, image and video panels
export function InlineInputForm({
    initialValue = "",
    placeholder,
    submitLabel,
    onSubmit,
    type = "url",
}: {
    initialValue?: string;
    placeholder: string;
    submitLabel: string;
    onSubmit: (value: string) => void;
    type?: "url" | "text";
}) {
    const [value, setValue] = useState(initialValue);

    const submit = () => onSubmit(value.trim());

    return (
        <div className="flex items-center gap-1.5">
            <input
                type={type}
                autoFocus
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    // Enter must not submit the surrounding auction form
                    if (e.key === "Enter") {
                        e.preventDefault();
                        submit();
                    }
                }}
                className="h-8 w-60 rounded border border-slate-300 px-2 text-sm outline-none focus:border-slate-500"
            />
            <button
                type="button"
                onClick={submit}
                className="h-8 rounded bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700"
            >
                {submitLabel}
            </button>
        </div>
    );
}
