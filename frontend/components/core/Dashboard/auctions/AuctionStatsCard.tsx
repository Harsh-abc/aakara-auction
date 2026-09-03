"use client"



import {
    Card,
    CardContent,
} from "@/components/ui/card"
import Image from "next/image"

interface AuctionStatsCardProps {
    title: string
    value: string | number
    description: string
    image: string
    imageClassName?: string
}

export function AuctionStatsCard({
    title,
    value,
    description,
    image,
    imageClassName = "h-15 w-15",

}: AuctionStatsCardProps) {
    return (
        <Card
            className="
        rounded-lg
        border-slate-200
        shadow-sm
        hover:shadow-md
        transition-shadow
        w-69.75
        h-26.75
      "
        >
            <CardContent className="flex items-center gap-6 p-4">

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
          `}
                >
                    <Image
                        src={image}
                        alt={title}
                        width={60}
                        height={60}
                        className={imageClassName}
                    />
                </div>

                {/* Content */}
                <div className="min-w-0">

                    <p className="text-[14px] text-[#414141]">
                        {title}
                    </p>

                    <p className="mt-0.5 text-[24px] leading-5 font-bold text-[#414141]">
                        {value}
                    </p>

                    <p className="mt-1 text-[12px] text-[#414141]">
                        {description}
                    </p>

                </div>

            </CardContent>
        </Card>
    )
}