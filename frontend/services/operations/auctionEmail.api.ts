import { apiConnector } from "../apiConnector"
import { adminEndPoints } from "../api"
import type {
    AuctionEmailAuction,
    AuctionEmailDraft,
    AuctionEmailRecipientList,
    AuctionEmailSendResult,
} from "@/lib/types/auctionEmail.types"

const { AUCTION_EMAILS_API, AUCTION_EMAIL_RECIPIENTS_API, AUCTION_EMAIL_SEND_API } = adminEndPoints

const authHeader = (token: string | null) => ({ Authorization: `Bearer ${token}` })

/** Every auction, with how many bidders are registered for it */
export async function getAuctionEmailAuctions(token: string | null): Promise<AuctionEmailAuction[]> {
    const response = await apiConnector({ method: "GET", url: AUCTION_EMAILS_API, header: authHeader(token) })
    return response.data.data
}

/** The bidders registered for one auction */
export async function getAuctionEmailRecipients(token: string | null, auctionUuid: string): Promise<AuctionEmailRecipientList> {
    const response = await apiConnector({ method: "GET", url: AUCTION_EMAIL_RECIPIENTS_API(auctionUuid), header: authHeader(token) })
    return response.data.data
}

/** Emails the picked bidders, or (test) one copy to the signed-in super admin */
export async function sendAuctionEmail(
    token: string | null,
    auctionUuid: string,
    draft: AuctionEmailDraft,
    options: { userUuids?: string[]; test?: boolean }
): Promise<AuctionEmailSendResult> {
    const response = await apiConnector({
        method: "POST",
        url: AUCTION_EMAIL_SEND_API(auctionUuid),
        body: { ...draft, userUuids: options.userUuids ?? [], test: options.test ?? false },
        header: authHeader(token),
    })
    return { message: response.data.message, sent: response.data.data.sent, failed: response.data.data.failed }
}
