import {
    emailLayout,
    escapeHtml,
    link,
    siteBase,
    textFooter,
} from "./registrationReceived.js";

export const BIDS_EMAIL = "bids@akaraart.com";
export const PROXY_BID_SET_SUBJECT = "The Fine Art Sale, December 2026 | Proxy Bid Confirmation";
const PREHEADER = "Your proxy bid has been set. It will bid for you up to your maximum.";

const detailRows = ({ userName, bidderId, auctionName, lotNumber, lotName, maxProxyBid, proxyBidDate }) => [
    ["Bidder Name", userName],
    ["Bidder ID", bidderId],
    ["Auction", auctionName],
    ["Lot Number", lotNumber],
    ["Lot Name", lotName],
    ["Maximum Proxy Bid", maxProxyBid],
    ["Status", "Active"],
    ["Date & Time", proxyBidDate],
].map(([label, value]) => [label, value || "—"]);

const paragraph = (html, margin = "0 0 16px 0") =>
    `<p style="margin:${margin}; font-size: 14px; line-height: 22px; color:#555555;">${html}</p>`;

// sent when a bidder sets or changes a proxy bid (bidding.services.js setProxyBidService)
export const proxyBidSetTemplate = ({ siteUrl = "", ...details }) => {
    const site = siteBase(siteUrl);
    const greeting = details.userName ? `Dear ${escapeHtml(details.userName)},` : "Dear Collector,";
    const rows = detailRows(details)
        .map(([label, value]) => `
                                                <tr>
                                                    <td style="padding: 8px 0; width: 150px; font-size: 11px; letter-spacing: 1.5px; color:#999999; text-transform: uppercase; vertical-align: top;">${escapeHtml(label)}</td>
                                                    <td style="padding: 8px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">${escapeHtml(value)}</td>
                                                </tr>`)
        .join("");

    const content = `
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                    ${greeting}
                                </p>
                                ${paragraph("This is to confirm that your proxy bid has been successfully set for the selected lot at AKARA's Inaugural Fine Art Sale.")}
                                ${paragraph("Your proxy bid will automatically place bids on your behalf, up to your specified maximum amount, in accordance with the auction's bidding rules and increments.", "0")}
                            </td>
                        </tr>

                        <!-- Proxy bid details -->
                        <tr>
                            <td style="padding: 24px 48px 0 48px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbeedc;">
                                    <tr>
                                        <td style="padding: 12px 24px;">
                                            <p style="margin:8px 0 4px 0; font-size: 11px; letter-spacing: 1.5px; color:#1a1a1a; text-transform: uppercase;">
                                                Proxy Bid Details
                                            </p>
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                ${rows}
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- How it works -->
                        <tr>
                            <td style="padding: 24px 48px 32px 48px;">
                                <p style="margin:0 0 10px 0; font-size: 11px; letter-spacing: 1.5px; color:#1a1a1a; text-transform: uppercase;">
                                    How Proxy Bidding Works
                                </p>
                                ${paragraph("The system will automatically increase your bid when required to maintain your position, following the applicable bidding increments and without exceeding your maximum proxy bid.")}
                                ${paragraph(`You can ${link(`${site}/registration`, "log in to your Akara Auction account")} to view your proxy bid details and monitor bidding activity.`)}
                                ${paragraph("Please note that your maximum proxy bid is confidential and will not be disclosed to other bidders.")}
                                ${paragraph(`<span style="color:#1a1a1a;">Proxy bidding will close at 12 PM IST (Indian Standard Time) on the day of the sale.</span>`)}
                                ${paragraph(`Thank you for your participation. For any assistance, please contact us at ${link(`mailto:${BIDS_EMAIL}`, BIDS_EMAIL)}.`, "0")}
                            </td>
                        </tr>`;

    return emailLayout({ site, heading: "Your Proxy Bid Has Been Set", preheader: PREHEADER, content });
};

// plain-text part, for clients that don't show HTML (and better deliverability)
export const proxyBidSetText = ({ siteUrl = "", ...details }) => {
    const site = siteBase(siteUrl);
    return [
        details.userName ? `Dear ${details.userName},` : "Dear Collector,",
        "",
        "This is to confirm that your proxy bid has been successfully set for the selected lot at AKARA's Inaugural Fine Art Sale.",
        "",
        "Your proxy bid will automatically place bids on your behalf, up to your specified maximum amount, in accordance with the auction's bidding rules and increments.",
        "",
        "Proxy Bid Details",
        ...detailRows(details).map(([label, value]) => `- ${label}: ${value}`),
        "",
        "How Proxy Bidding Works",
        "The system will automatically increase your bid when required to maintain your position, following the applicable bidding increments and without exceeding your maximum proxy bid.",
        "",
        `You can log in to your Akara Auction account to view your proxy bid details and monitor bidding activity: ${site}/registration`,
        "",
        "Please note that your maximum proxy bid is confidential and will not be disclosed to other bidders.",
        "",
        "Proxy bidding will close at 12 PM IST (Indian Standard Time) on the day of the sale.",
        "",
        `Thank you for your participation. For any assistance, please contact us at ${BIDS_EMAIL}.`,
        "",
        ...textFooter(site),
    ].join("\n");
};
