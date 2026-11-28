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
// Settings → Auction Emails: a message a super admin writes in the rich
// text editor and sends to the bidders registered for one auction
// (auctionBroadcast.services.js). `messageHtml` must already be cleaned
// and filled in (mail/richText.js emailSafeHtml + fillMergeTags);
// `messageText` is its plain-text version. Every one carries the
// internet connectivity notice.
// =====================================================================

export const auctionPageUrl = (siteUrl, auctionUuid) => {
    const site = siteBase(siteUrl);
    return auctionUuid ? `${site}/auctions/${auctionUuid}` : site;
};

export const auctionMessageTemplate = ({
    userName = "",
    siteUrl = "",
    auctionTitle = "",
    auctionDate = "",
    auctionUuid = "",
    paddleNumber = "",
    heading = "",
    greeting = true,
    messageHtml = "",
    messageText = "",
}) => {
    const site = siteBase(siteUrl);
    const hello = userName ? `Dear ${escapeHtml(userName)},` : "Dear Collector,";
    const saleLine = [auctionTitle, auctionDate].filter(Boolean).map(escapeHtml).join(" &middot; ");
    const preheader = escapeHtml(messageText.replace(/\s+/g, " ").trim().slice(0, 140) || `A message about ${auctionTitle}`);

    const content = `
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px; font-size: 14px; line-height: 22px; color:#555555;">
                                ${greeting ? `<p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">${hello}</p>` : ""}
                                ${messageHtml}
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
                                <a href="${escapeHtml(auctionPageUrl(site, auctionUuid))}" style="display:inline-block; background-color:#1a1a1a; color:#ffffff; padding: 14px 32px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration:none;">
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
export const auctionMessageText = ({
    userName = "",
    siteUrl = "",
    auctionTitle = "",
    auctionDate = "",
    auctionUuid = "",
    paddleNumber = "",
    greeting = true,
    messageText = "",
}) => {
    const site = siteBase(siteUrl);
    return [
        ...(greeting ? [userName ? `Dear ${userName},` : "Dear Collector,", ""] : []),
        messageText,
        "",
        ...(auctionTitle ? [`Auction: ${[auctionTitle, auctionDate].filter(Boolean).join(" · ")}`] : []),
        ...(paddleNumber ? [`Your paddle number: ${paddleNumber}`] : []),
        `View the auction: ${auctionPageUrl(site, auctionUuid)}`,
        "",
        ...connectivityNoticeText(),
        "",
        `If you have any questions or require assistance, please contact us at ${AUCTION_EMAIL}`,
        "",
        ...textFooter(site),
    ].join("\n");
};
