"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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
}

export default function DatePicker({
    value,
    onChange,
    placeholder = "",
    disabled = false,
    className,
}: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "h-11 w-full justify-between px-3 text-left font-normal",
                        !value && "text-slate-400",
                        className
                    )}
                >
                    {value ? (
                        format(value, "dd MMM yyyy")
                    ) : (
                        <span>{placeholder}</span>
                    )}

                    <CalendarIcon className="h-4 w-4 text-slate-500" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="w-auto p-0"
                align="start"
            >
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={onChange}
                />
            </PopoverContent>
        </Popover>
    );
}