import { PiCommandLight } from "react-icons/pi";

import { cn } from "@/lib/utils";

// shown next to "Lot N" on lots the admin marked as special
export function SpecialLotIcon({ lot, className }: { lot: { isSpecial?: boolean }; className?: string }) {
    if (!lot.isSpecial) return null;
    return <PiCommandLight aria-label="Special lot" title="Special lot" className={cn("inline-block size-3.5 shrink-0 align-[-2px]", className)} />;
}
