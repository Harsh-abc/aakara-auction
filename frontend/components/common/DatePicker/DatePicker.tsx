"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
    value?: Date;
    onChange?: (date: Date | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;

    /** Days before this are greyed out (compared by day, not time). */
    minDate?: Date;

    /** Days after this are greyed out. */
    maxDate?: Date;

    /** Month the calendar opens on when nothing is selected (e.g. the start date's month). */
    defaultMonth?: Date;
}

export default function DatePicker({
    value,
    onChange,
    placeholder = "Select a date",
    disabled = false,
    className,
    minDate,
    maxDate,
    defaultMonth,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const disabledDays = [
        ...(minDate ? [{ before: startOfDay(minDate) }] : []),
        ...(maxDate ? [{ after: startOfDay(maxDate) }] : []),
    ];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {/* Base UI trigger renders AS the Button (no nested <button>) */}
            <PopoverTrigger
                disabled={disabled}
                render={
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "h-11 w-full justify-start text-left font-normal",
                            !value && "text-muted-foreground",
                            className
                        )}
                    />
                }
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(value, "dd MMM yyyy") : placeholder}
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    defaultMonth={value ?? defaultMonth ?? minDate}
                    disabled={disabledDays.length ? disabledDays : undefined}
                    onSelect={(date) => {
                        onChange?.(date);
                        if (date) setOpen(false); // close after picking
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}