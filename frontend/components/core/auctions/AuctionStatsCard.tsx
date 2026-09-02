"use client"

import { LucideIcon } from "lucide-react"

import {
    Card,
    CardContent,
} from "@/components/ui/card"

interface AuctionStatsCardProps {
    title: string
    value: string | number
    description: string
    icon: LucideIcon
    iconClassName?: string
    iconBgClassName?: string
}

export function AuctionStatsCard({
    title,
    value,
    description,
    icon: Icon,
    iconClassName = "text-slate-600",
    iconBgClassName = "bg-slate-100",
}: AuctionStatsCardProps) {
    return (
        <Card
            className="
        rounded-lg
        border-slate-200
        shadow-sm
        hover:shadow-md
        transition-shadow
      "
        >
            <CardContent className="flex items-center gap-4 p-4">

                {/* Icon */}
                <div
                    className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            ${iconBgClassName}
          `}
                >
                    <Icon
                        className={`h-5 w-5 ${iconClassName}`}
                        strokeWidth={1.6}
                    />
                </div>

                {/* Content */}
                <div className="min-w-0">

                    <p className="text-[12px] text-slate-500">
                        {title}
                    </p>

                    <p className="mt-0.5 text-[20px] leading-5 font-semibold text-slate-800">
                        {value}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500">
                        {description}
                    </p>

                </div>

            </CardContent>
        </Card>
    )
}