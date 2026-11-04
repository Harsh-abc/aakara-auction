import {
    AUCTION_EMAIL,
    emailLayout,
    escapeHtml,
    link,
    siteBase,
    textFooter,
} from "./registrationReceived.js";

export const REGISTRATION_APPROVED_SUBJECT = "The Fine Art Sale: December 2026 | Your Registration Is Approved";
const PREHEADER = "Your KYC documents have been verified. Your bidding access is now enabled.";

const loginUrl = (site) => `${site}/registration`;

// sent when a super admin gives a user bidder access (role → BIDDER, admin.services.js changeUserRoleService)
export const registrationApprovedTemplate = ({ userName = "", siteUrl = "" }) => {
    const site = siteBase(siteUrl);
    const greeting = userName ? `Dear ${escapeHtml(userName)},` : "Dear Collector,";

    const content = `
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                    ${greeting}
                                </p>
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Thank you for registering with AKARA for our upcoming auction.
                                </p>
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    We are pleased to confirm that your KYC documents have been successfully verified and
                                    your bidding access is now enabled.
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    You can now log in to your Akara Auctions account and participate in the sale.
                                </p>
                            </td>
                        </tr>

                        <!-- Before bidding -->
                        <tr>
                            <td style="padding: 24px 48px 0 48px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbeedc;">
                                    <tr>
                                        <td style="padding: 20px 24px;">
                                            <p style="margin:0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                                Before placing your bids, please review the auction details,
                                                ${link(`${site}/terms`, "Terms and Conditions of Sale")} and bidding guidelines.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Button -->
                        <tr>
                            <td align="center" style="padding: 32px 40px 8px 40px;">
                                <a href="${escapeHtml(loginUrl(site))}" style="display:inline-block; background-color:#1a1a1a; color:#ffffff; padding: 14px 32px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration:none;">
                                    Log in to bid
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 24px 48px 32px 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    If you have any questions or require assistance, please contact us at
                                    ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}.
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    We look forward to welcoming you to our inaugural sale.
                                </p>
                            </td>
                        </tr>`;

    return emailLayout({ site, heading: "Registration Approved", preheader: PREHEADER, content });
};

// plain-text part, for clients that don't show HTML (and better deliverability)
export const registrationApprovedText = ({ userName = "", siteUrl = "" }) => {
    const site = siteBase(siteUrl);
    return [
        userName ? `Dear ${userName},` : "Dear Collector,",
        "",
        "Thank you for registering with AKARA for our upcoming auction.",
        "",
        "We are pleased to confirm that your KYC documents have been successfully verified and your bidding access is now enabled.",
        "",
        `You can now log in to your Akara Auctions account and participate in the sale: ${loginUrl(site)}`,
        "",
        `Before placing your bids, please review the auction details, Terms and Conditions of Sale (${site}/terms) and bidding guidelines.`,
        "",
        `If you have any questions or require assistance, please contact us at ${AUCTION_EMAIL}`,
        "",
        "We look forward to welcoming you to our inaugural sale.",
        "",
        ...textFooter(site),
    ].join("\n");
};
