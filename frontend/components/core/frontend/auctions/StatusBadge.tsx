import { cn } from "@/lib/utils";

// small square tag — gold outline before a sale opens, black while it's live, grey once it has closed
const TONES = {
    upcoming: "border-[#d0a55d] bg-white text-[#0d0d0d]",
    live: "border-black bg-black text-white",
    closed: "border-[#cecece] bg-white text-[#717171]",
};

export function StatusBadge({ label, tone }: { label: string; tone: keyof typeof TONES }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 border px-1.75 py-0.75 text-[10px] leading-3.75 tracking-[0.14em] uppercase", TONES[tone])}>
            {tone === "live" && <span className="size-1 shrink-0 rounded-full bg-[#d0a55d]" />}
            {label}
        </span>
    );
}
