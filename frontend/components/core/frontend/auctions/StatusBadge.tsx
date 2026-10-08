import { cn } from "@/lib/utils"

// small outlined tag — gold for upcoming, maroon for live, grey once a sale has closed
const TONES = {
    upcoming: "border-[#C9A24B] text-[#9A7524]",
    live: "border-[#7A3D5E] text-[#7A3D5E]",
    closed: "border-neutral-300 text-neutral-500",
}

export function StatusBadge({ label, tone }: { label: string; tone: keyof typeof TONES }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 border bg-white px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em]",
                TONES[tone]
            )}
        >
            {tone === "live" && <span className="size-1.5 animate-pulse rounded-full bg-[#7A3D5E]" />}
            {label}
        </span>
    )
}
