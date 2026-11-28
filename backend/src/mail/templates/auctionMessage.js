import {
    AUCTION_EMAIL,
    connectivityNoticeRow,
    connectivityNoticeText,
    emailLayout,
    escapeHtml,
    link,
    siteBase,
    textFooter,
} from "./registrationReceived.js";

// =====================================================================
// Settings → Auction Emails: a message a super admin writes and sends to
// the bidders registered for one auction (auctionBroadcast.services.js).
// The message is plain text — escaped here, blank lines start a new paragraph.
// Every one carries the internet connectivity notice.
// =====================================================================

const paragraphs = (message) =>
    String(message ?? "")
        .replace(/\r\n?/g, "\n")
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean);

const auctionUrl = (site, auctionUuid) => (auctionUuid ? `${site}/auctions/${auctionUuid}` : site);

export const auctionMessageTemplate = ({ userName = "", siteUrl = "", auctionTitle = "", auctionDate = "", auctionUuid = "", paddleNumber = "", heading = "", message = "" }) => {
    const site = siteBase(siteUrl);
    const greeting = userName ? `Dear ${escapeHtml(userName)},` : "Dear Collector,";
    const body = paragraphs(message)
        .map((block) => `
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    ${escapeHtml(block).replace(/\n/g, "<br/>")}
                                </p>`)
        .join("");
    const saleLine = [auctionTitle, auctionDate].filter(Boolean).map(escapeHtml).join(" &middot; ");
    const preheader = escapeHtml(paragraphs(message)[0]?.replace(/\s+/g, " ").slice(0, 140) || `A message about ${auctionTitle}`);

    const content = `
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                    ${greeting}
                                </p>
                                ${body}
                            </td>
                        </tr>

                        ${saleLine ? `<!-- The sale -->
                        <tr>
                            <td style="padding: 8px 48px 0 48px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbeedc;">
                                    <tr>
                                        <td style="padding: 16px 24px;">
                                            <p style="margin:0 0 4px 0; font-size: 11px; letter-spacing: 1.5px; color:#999999; text-transform: uppercase;">Auction</p>
                                            <p style="margin:0; font-size: 14px; line-height: 22px; color:#1a1a1a;">${saleLine}</p>
                                            ${paddleNumber ? `<p style="margin:8px 0 0 0; font-size: 13px; line-height: 20px; color:#555555;">Your paddle number: <span style="color:#1a1a1a;">${escapeHtml(paddleNumber)}</span></p>` : ""}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>` : ""}

                        ${connectivityNoticeRow()}

                        <!-- Button -->
                        <tr>
                            <td align="center" style="padding: 32px 40px 8px 40px;">
                                <a href="${escapeHtml(auctionUrl(site, auctionUuid))}" style="display:inline-block; background-color:#1a1a1a; color:#ffffff; padding: 14px 32px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration:none;">
                                    View the auction
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 24px 48px 32px 48px;">
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    If you have any questions or require assistance, please contact us at
                                    ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}.
                                </p>
                            </td>
                        </tr>`;

    return emailLayout({
        site,
        heading: heading || auctionTitle || "A Message from AKARA",
        preheader,
        eyebrow: auctionTitle ? escapeHtml(auctionTitle) : undefined,
        content,
    });
};

// plain-text part, for clients that don't show HTML (and better deliverability)
export const auctionMessageText = ({ userName = "", siteUrl = "", auctionTitle = "", auctionDate = "", auctionUuid = "", paddleNumber = "", message = "" }) => {
    const site = siteBase(siteUrl);
    return [
        userName ? `Dear ${userName},` : "Dear Collector,",
        "",
        ...paragraphs(message).flatMap((block) => [block, ""]),
        ...(auctionTitle ? [`Auction: ${[auctionTitle, auctionDate].filter(Boolean).join(" · ")}`] : []),
        ...(paddleNumber ? [`Your paddle number: ${paddleNumber}`] : []),
        `View the auction: ${auctionUrl(site, auctionUuid)}`,
        "",
        ...connectivityNoticeText(),
        "",
        `If you have any questions or require assistance, please contact us at ${AUCTION_EMAIL}`,
        "",
        ...textFooter(site),
    ].join("\n");
};
