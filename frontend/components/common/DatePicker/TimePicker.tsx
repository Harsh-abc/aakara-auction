"use client";

import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TimePickerProps {
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

export default function TimePicker({
    value = "",
    onChange,
    disabled = false,
    className,
}: TimePickerProps) {
    return (
        <div className="">
            <Input
                type="time"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.value)}
                className={`h-11 pr-10 ${className ?? ""}`}
            />

        </div>
    );
}