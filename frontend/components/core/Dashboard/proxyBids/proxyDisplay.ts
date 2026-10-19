import type { ProxyOutcome } from "@/lib/types/proxyBid.types"

import type { PillTone } from "../home/dashboardUi"

// how a proxy bid is doing — shared by the proxy bids page, bid history and the console
export const PROXY_OUTCOMES: Record<ProxyOutcome, { label: string; tone: PillTone; hint: string }> = {
    WAITING: { label: "Waiting for lot", tone: "slate", hint: "The lot hasn't opened. Proxy bids are placed when the auctioneer calls the hammer." },
    LEADING: { label: "Leading", tone: "green", hint: "The lot is live and this bidder holds it." },
    IN_PLAY: { label: "In play", tone: "amber", hint: "The lot is live and this maximum is above the current bid — it's placed when the auctioneer calls the hammer." },
    OUTBID: { label: "Outbid", tone: "amber", hint: "The bidding went past this maximum, or another bidder won the lot." },
    WON: { label: "Won", tone: "green", hint: "The lot sold to this bidder." },
    RESERVE_NOT_MET: { label: "Reserve not met", tone: "amber", hint: "This bidder held the lot when it closed, but below the reserve." },
    LOT_CLOSED: { label: "Lot closed unsold", tone: "slate", hint: "The lot closed without selling." },
    WITHDRAWN: { label: "Withdrawn", tone: "red", hint: "Taken out of play when the bidder lost access to the lot." },
}
