import type { PublicLot } from "@/lib/types/publicAuction.types";

import { Tag } from "../lot/LotTag";
import { LOT_BADGES } from "./lotDisplay";

// the same square tags as the live room: "• LIVE" black while open, red dot once sold, outlined after that;
// upNext: the next lot to open gets "Upcoming"
export function LotBadge({ lot, upNext }: { lot: PublicLot; upNext?: boolean }) {
    if (upNext) return <Tag tone="upcoming" label="Upcoming" />;

    const badge = LOT_BADGES[lot.status];
    if (!badge) return null;

    return <Tag tone={badge.live ? "live" : lot.status === "SOLD" ? "sold" : "closed"} label={badge.label} />;
}
