import {
    AUCTION_EMAIL,
    emailLayout,
    escapeHtml,
    link,
    siteBase,
    textFooter,
} from "./registrationReceived.js";

export const WINNING_BID_SUBJECT = "The Fine Art Sale, December 2026 | Winning Bid Confirmation";
const PREHEADER = "Congratulations — you have won a lot at AKARA's Inaugural Fine Art Sale.";

const PREMIUM_NOTE = "Including buyer's premium";

// [label, value, note] — winningBidAmount is the hammer price plus the buyer's premium
const detailRows = ({ auctionName, lotNumber, lotName, winningBidAmount }) => [
    ["Auction", auctionName],
    ["Lot Number", lotNumber],
    ["Lot Name", lotName],
    ["Winning Bid", winningBidAmount, winningBidAmount && PREMIUM_NOTE],
].map(([label, value, note]) => [label, value || "—", note]);

// sent when a lot is sold to the user (services/auctionMail.services.js)
export const winningBidTemplate = ({ userName = "", siteUrl = "", ...lot }) => {
    const site = siteBase(siteUrl);
    const greeting = userName ? `Dear ${escapeHtml(userName)},` : "Dear Collector,";
    const rows = detailRows(lot)
        .map(([label, value, note]) => `
                                                <tr>
                                                    <td style="padding: 8px 0; width: 130px; font-size: 11px; letter-spacing: 1.5px; color:#999999; text-transform: uppercase; vertical-align: top;">${label}</td>
                                                    <td style="padding: 8px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">${escapeHtml(value)}${note ? `<br><span style="font-size: 11px; line-height: 16px; color:#999999;">${escapeHtml(note)}</span>` : ""}</td>
                                                </tr>`)
        .join("");

    const content = `
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                    ${greeting}
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    We are pleased to confirm that you have won the following lot at AKARA's Inaugural
                                    Fine Art Sale in December 2026. Thank you for your participation.
                                </p>
                            </td>
                        </tr>

                        <!-- Winning details -->
                        <tr>
                            <td style="padding: 24px 48px 0 48px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbeedc;">
                                    <tr>
                                        <td style="padding: 12px 24px;">
                                            <p style="margin:8px 0 4px 0; font-size: 11px; letter-spacing: 1.5px; color:#1a1a1a; text-transform: uppercase;">
                                                Winning Details
                                            </p>
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                ${rows}
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 24px 48px 32px 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Your invoice will be sent to you shortly, along with details regarding payment and collection.
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Should you have any questions or require assistance, please contact us at
                                    ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}.
                                </p>
                            </td>
                        </tr>`;

    return emailLayout({ site, heading: "Congratulations on Your Winning Bid", preheader: PREHEADER, content });
};

// plain-text part, for clients that don't show HTML (and better deliverability)
export const winningBidText = ({ userName = "", siteUrl = "", ...lot }) => [
    userName ? `Dear ${userName},` : "Dear Collector,",
    "",
    "We are pleased to confirm that you have won the following lot at AKARA's Inaugural Fine Art Sale in December 2026. Thank you for your participation.",
    "",
    "Winning Details",
    ...detailRows(lot).map(([label, value, note]) => `- ${label}: ${value}${note ? ` (${note.toLowerCase()})` : ""}`),
    "",
    "Your invoice will be sent to you shortly, along with details regarding payment and collection.",
    "",
    `Should you have any questions or require assistance, please contact us at ${AUCTION_EMAIL}.`,
    "",
    ...textFooter(siteBase(siteUrl)),
].join("\n");
