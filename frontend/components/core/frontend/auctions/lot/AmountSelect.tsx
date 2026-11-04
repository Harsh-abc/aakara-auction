"use client"

import { Select } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

// the dropdown's colours — pass `colors` to restyle one dropdown, or change the defaults to restyle them all
export type AmountSelectColors = {
    border: string
    /** border when hovered, focused or open */
    activeBorder: string
    text: string
    /** options that aren't highlighted or selected */
    muted: string
    background: string
    /** the option under the pointer / keyboard */
    highlight: string
}

// same palette as the lot listing's sort dropdown
const DEFAULT_COLORS: AmountSelectColors = {
    border: "#cecece",
    activeBorder: "#0d0d0d",
    text: "#0d0d0d",
    muted: "#717171",
    background: "#ffffff",
    highlight: "#f4f2ef",
}

// the trigger and the (portalled) list each need the variables
const colorVars = (colors?: Partial<AmountSelectColors>) => {
    const c = { ...DEFAULT_COLORS, ...colors }
    return {
        "--amount-select-border": c.border,
        "--amount-select-active-border": c.activeBorder,
        "--amount-select-text": c.text,
        "--amount-select-muted": c.muted,
        "--amount-select-bg": c.background,
        "--amount-select-highlight": c.highlight,
    } as CSSProperties
}

type AmountSelectProps = {
    id?: string
    value: string
    options: string[]
    onChange: (value: string) => void
    /** "1285000" → "₹ 12,85,000" */
    format: (amount: string) => string
    disabled?: boolean
    colors?: Partial<AmountSelectColors>
    className?: string
    /** shows a "View more" button at the end of the list, for more options than `options` holds */
    onViewMore?: () => void
}

// a styled pick-one list of amounts (Base UI select rather than a native one, so the open list can be styled)
export function AmountSelect({ id, value, options, onChange, format, disabled, colors, className, onViewMore }: AmountSelectProps) {
    const style = colorVars(colors)

    return (
        <Select.Root value={value} onValueChange={(next) => next && onChange(next)} disabled={disabled}>
            <Select.Trigger
                id={id}
                style={style}
                className={cn(
                    "flex h-11 w-full cursor-pointer items-center justify-between gap-3 border border-(--amount-select-border) bg-(--amount-select-bg) px-3 text-sm text-(--amount-select-text) tabular-nums outline-none hover:border-(--amount-select-active-border) focus-visible:border-(--amount-select-active-border) data-disabled:cursor-not-allowed data-disabled:opacity-50 data-popup-open:border-(--amount-select-active-border)",
                    className
                )}
            >
                <Select.Value>{(selected: string) => (selected ? format(selected) : "")}</Select.Value>
                <Select.Icon className="text-(--amount-select-muted)">
                    <ChevronDown className="size-4" />
                </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Positioner side="bottom" align="start" sideOffset={4} alignItemWithTrigger={false} className="z-50 outline-none">
                    <Select.Popup
                        style={style}
                        className="max-h-[min(18rem,var(--available-height))] min-w-(--anchor-width) overflow-y-auto border border-(--amount-select-border) bg-(--amount-select-bg) py-1 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.35)] outline-none"
                    >
                        <Select.List>
                            {options.map((option) => (
                                <Select.Item
                                    key={option}
                                    value={option}
                                    className="flex cursor-pointer items-center justify-between gap-4 px-3 py-2.5 text-sm whitespace-nowrap text-(--amount-select-muted) tabular-nums outline-none select-none data-highlighted:bg-(--amount-select-highlight) data-highlighted:text-(--amount-select-text) data-selected:text-(--amount-select-text)"
                                >
                                    <Select.ItemText>{format(option)}</Select.ItemText>
                                    <Select.ItemIndicator>
                                        <Check className="size-3.5" />
                                    </Select.ItemIndicator>
                                </Select.Item>
                            ))}
                        </Select.List>
                        {onViewMore && (
                            <button
                                type="button"
                                onClick={onViewMore}
                                className="w-full cursor-pointer border-t border-(--amount-select-border) px-3 py-2.5 text-left text-[11px] font-medium tracking-[0.2em] text-(--amount-select-text) uppercase outline-none hover:bg-(--amount-select-highlight) focus-visible:bg-(--amount-select-highlight)"
                            >
                                View more
                            </button>
                        )}
                    </Select.Popup>
                </Select.Positioner>
            </Select.Portal>
        </Select.Root>
    )
}
