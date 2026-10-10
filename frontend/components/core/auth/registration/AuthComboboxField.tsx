"use client"

import { useCallback, useImperativeHandle, useRef, useState } from "react"
import { Combobox } from "@base-ui/react/combobox"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthFieldError, authInputClass, authInputErrorClass, authLabelClass } from "./AuthField"

type Virtualizer = ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>

const ITEM_HEIGHT = 36

type AuthComboboxFieldProps = {
    id: string
    label: string
    items: string[]
    value: string
    onValueChange: (value: string) => void
    error?: string
    placeholder?: string
    disabled?: boolean
    emptyText?: string
}

// searchable single-select styled like AuthField; the input carries `id`, so focusing it by id still works.
// the list is virtualized, so a country with ~14k cities still opens and scrolls instantly
export function AuthComboboxField({
    id,
    label,
    items,
    value,
    onValueChange,
    error,
    placeholder,
    disabled,
    emptyText = "No matches found",
}: AuthComboboxFieldProps) {
    const [open, setOpen] = useState(false)
    const virtualizerRef = useRef<Virtualizer | null>(null)
    const errorId = `${id}-error`

    return (
        <div>
            <label htmlFor={id} className={authLabelClass}>
                {label}
            </label>

            <Combobox.Root
                virtualized
                items={items}
                value={value || null}
                onValueChange={(next) => onValueChange(next ?? "")}
                open={open}
                onOpenChange={setOpen}
                disabled={disabled}
                // only the rendered rows exist in the DOM, so keep the highlighted one scrolled into view
                onItemHighlighted={(item, { reason, index }) => {
                    const virtualizer = virtualizerRef.current
                    if (!item || !virtualizer) return

                    const isEnd = index === virtualizer.options.count - 1
                    const shouldScroll = reason === "none" || (reason === "keyboard" && (index === 0 || isEnd))

                    if (shouldScroll) {
                        queueMicrotask(() => virtualizer.scrollToIndex(index, { align: isEnd ? "start" : "end" }))
                    }
                }}
            >
                <div className="relative">
                    <Combobox.Input
                        id={id}
                        placeholder={placeholder}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                        className={cn(authInputClass, "pr-11", error && authInputErrorClass)}
                    />
                    <Combobox.Trigger
                        aria-label={`Show ${label.toLowerCase()} options`}
                        className="absolute right-0 top-0 flex h-full w-11 cursor-pointer items-center justify-center text-neutral-400 hover:text-neutral-900 disabled:cursor-not-allowed"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Combobox.Trigger>
                </div>

                <Combobox.Portal>
                    <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
                        <Combobox.Popup className="w-(--anchor-width) max-w-(--available-width) border border-neutral-300 bg-white text-neutral-900 shadow-lg">
                            <Combobox.Empty>
                                <div className="px-3.5 py-3 text-sm text-neutral-500">{emptyText}</div>
                            </Combobox.Empty>
                            <Combobox.List className="p-0">
                                <VirtualizedOptions open={open} virtualizerRef={virtualizerRef} />
                            </Combobox.List>
                        </Combobox.Popup>
                    </Combobox.Positioner>
                </Combobox.Portal>
            </Combobox.Root>

            <AuthFieldError id={errorId} message={error} />
        </div>
    )
}

function VirtualizedOptions({
    open,
    virtualizerRef,
}: {
    open: boolean
    virtualizerRef: React.RefObject<Virtualizer | null>
}) {
    const filteredItems = Combobox.useFilteredItems<string>()
    const scrollElementRef = useRef<HTMLDivElement | null>(null)

    const virtualizer = useVirtualizer({
        enabled: open,
        count: filteredItems.length,
        getScrollElement: () => scrollElementRef.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 20,
        paddingStart: 4,
        paddingEnd: 4,
        scrollPaddingStart: 4,
        scrollPaddingEnd: 4,
    })

    useImperativeHandle(virtualizerRef, () => virtualizer)

    const handleScrollElementRef = useCallback(
        (element: HTMLDivElement | null) => {
            scrollElementRef.current = element
            if (element) virtualizer.measure()
        },
        [virtualizer]
    )

    if (!filteredItems.length) return null

    const totalSize = virtualizer.getTotalSize()

    return (
        <div
            role="presentation"
            ref={handleScrollElementRef}
            className="h-[min(18rem,var(--total-size))] max-h-(--available-height) overflow-auto overscroll-contain"
            style={{ "--total-size": `${totalSize}px` } as React.CSSProperties}
        >
            <div role="presentation" className="relative w-full" style={{ height: totalSize }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const item = filteredItems[virtualItem.index]
                    if (!item) return null

                    return (
                        <Combobox.Item
                            key={virtualItem.key}
                            index={virtualItem.index}
                            data-index={virtualItem.index}
                            ref={virtualizer.measureElement}
                            value={item}
                            aria-setsize={filteredItems.length}
                            aria-posinset={virtualItem.index + 1}
                            className="grid cursor-pointer grid-cols-[1rem_1fr] items-center gap-2 px-3.5 text-sm outline-none select-none data-highlighted:bg-neutral-100"
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: virtualItem.size,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            <Combobox.ItemIndicator className="col-start-1">
                                <Check className="h-4 w-4" />
                            </Combobox.ItemIndicator>
                            <span className="col-start-2 truncate">{item}</span>
                        </Combobox.Item>
                    )
                })}
            </div>
        </div>
    )
}
