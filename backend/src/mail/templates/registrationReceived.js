const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// the same contact details as the site footer (frontend/lib/constants/site-text.ts)
const AUCTION_EMAIL = "auction@akaraart.com";
const BIDS_EMAIL = "bids@akaraart.com";
const GALLERY_ADDRESS = "3C Amarchand Mansion, 2nd Floor, 16 Madam Cama Road, Mumbai 400001, India";
const PHONE = "+91 98209 41300";
const PHONE_HREF = "+919820941300";
const WEBSITE_URL = "https://akaraart.com";
// footer links whose value is empty are left out
const INSTAGRAM_URL = process.env.AKARA_INSTAGRAM_URL ?? "";
const PRIVACY_POLICY_PATH = process.env.AKARA_PRIVACY_POLICY_PATH ?? "";

const KYC_DOCUMENTS = ["Aadhaar Card (only for Indian Citizens)", "PAN Card", "Passport"];

export const REGISTRATION_RECEIVED_SUBJECT = "The Fine Art Sale: December 2026 | Registration Received";
const PREHEADER = "Thank you for registering with Akara. Our team will review your application and be in touch shortly.";

// sent once the account is created (auth.services.js createUserFromPending), alongside the "Thank you for registering" popup
export const registrationReceivedTemplate = ({ userName = "", siteUrl = "" }) => {
    const site = (siteUrl || WEBSITE_URL).replace(/\/+$/, "");
    const bannerUrl = `${site}/email/akara-registration-banner.jpg`;
    const greeting = userName ? `Dear ${escapeHtml(userName)},` : "Dear Collector,";
    const link = (href, label) =>
        `<a href="${escapeHtml(href)}" style="color:#1a1a1a; text-decoration:underline;">${label}</a>`;

    const items = KYC_DOCUMENTS
        .map((title) => `<li style="margin: 0 0 6px 0;">${escapeHtml(title)}</li>`)
        .join("");

    const socialLinks = [link(WEBSITE_URL, "akaraart.com"), INSTAGRAM_URL && link(INSTAGRAM_URL, "Instagram")]
        .filter(Boolean)
        .join(" &nbsp;|&nbsp; ");
    const legalLinks = [link(`${site}/terms`, "Terms of Sale"), PRIVACY_POLICY_PATH && link(`${site}${PRIVACY_POLICY_PATH}`, "Privacy Policy")]
        .filter(Boolean)
        .join(" &nbsp;|&nbsp; ");

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Registration Received</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f5f5f3; font-family: Georgia, 'Times New Roman', serif;">
        <!-- Preheader (inbox preview line) -->
        <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f5f5f3; opacity:0;">
            ${PREHEADER}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f3; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border: 1px solid #e5e4e0;">

                        <!-- Banner -->
                        <tr>
                            <td style="padding:0; background-color:#2a1d17;">
                                <a href="${escapeHtml(site)}" style="text-decoration:none;">
                                    <img src="${escapeHtml(bannerUrl)}" width="600" alt="Akara — Inaugural Fine Art Auction. Registrations now open." style="display:block; width:100%; max-width:600px; height:auto; border:0; color:#ffffff; font-size:16px;" />
                                </a>
                            </td>
                        </tr>

                        <!-- Heading -->
                        <tr>
                            <td align="center" style="padding: 40px 40px 0 40px;">
                                <p style="margin:0 0 12px 0; font-size: 11px; letter-spacing: 2px; color:#999999; text-transform: uppercase;">
                                    The Fine Art Sale &middot; December 2026
                                </p>
                                <h1 style="margin:0; font-size: 22px; font-weight: 400; letter-spacing: 1px; color:#1a1a1a; text-transform: uppercase;">
                                    Registration Received
                                </h1>
                            </td>
                        </tr>

                        <!-- Thin gold divider -->
                        <tr>
                            <td style="padding: 24px 60px 0 60px;">
                                <div style="border-top: 1px solid #c9a44c; width: 40px; margin: 0 auto;"></div>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                    ${greeting}
                                </p>
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Thank you for registering with AKARA for our upcoming auction.
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    To complete your registration and enable bidding access, please email a copy of your
                                    KYC documents to ${link(`mailto:${BIDS_EMAIL}`, BIDS_EMAIL)}.
                                </p>
                            </td>
                        </tr>

                        <!-- Accepted documents -->
                        <tr>
                            <td style="padding: 24px 48px 0 48px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbeedc;">
                                    <tr>
                                        <td style="padding: 20px 24px;">
                                            <p style="margin:0 0 10px 0; font-size: 11px; letter-spacing: 1.5px; color:#1a1a1a; text-transform: uppercase;">
                                                Accepted documents
                                            </p>
                                            <ul style="margin:0; padding-left: 20px; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                                ${items}
                                            </ul>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 24px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Our team will review your documents and notify you once your bidding access has been enabled.
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    If you have any questions, please contact us at ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}.
                                </p>
                            </td>
                        </tr>

                        <!-- Button -->
                        <tr>
                            <td align="center" style="padding: 32px 40px;">
                                <a href="mailto:${BIDS_EMAIL}?subject=${encodeURIComponent("KYC documents for registration")}" style="display:inline-block; background-color:#1a1a1a; color:#ffffff; padding: 14px 32px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration:none;">
                                    Email KYC documents
                                </a>
                            </td>
                        </tr>

                        <!-- Sign-off -->
                        <tr>
                            <td style="padding: 0 48px 40px 48px;">
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Warm regards,<br/>
                                    <span style="color:#1a1a1a; letter-spacing: 1.5px;">AKARA AUCTIONS</span>
                                </p>
                            </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                            <td style="border-top: 1px solid #efeeec; padding-top: 24px;"></td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding: 8px 40px 40px 40px;">
                                <p style="margin:0 0 6px 0; font-size: 11px; letter-spacing: 1.5px; color:#999999; text-transform: uppercase;">
                                    Akara Auctions
                                </p>
                                <p style="margin:0 0 4px 0; font-size: 11px; line-height: 18px; color:#999999;">
                                    ${GALLERY_ADDRESS}
                                </p>
                                <p style="margin:0 0 4px 0; font-size: 11px; line-height: 18px; color:#999999;">
                                    ${link(`tel:${PHONE_HREF}`, PHONE)} &nbsp;|&nbsp; ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}
                                </p>
                                <p style="margin:0 0 20px 0; font-size: 11px; line-height: 18px; color:#999999;">
                                    ${socialLinks}
                                </p>
                                <p style="margin:0 0 12px 0; font-size: 11px; line-height: 18px; color:#bbbbbb;">
                                    You are receiving this email because you registered on the Akara Auction portal.
                                    If you did not initiate this registration, please contact us at ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}.
                                </p>
                                <p style="margin:0 0 6px 0; font-size: 11px; line-height: 18px; color:#bbbbbb;">
                                    ${legalLinks}
                                </p>
                                <p style="margin:0; font-size: 11px; color:#bbbbbb;">
                                    © ${new Date().getFullYear()} Akara. All rights reserved.
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

// plain-text part, for clients that don't show HTML (and better deliverability)
export const registrationReceivedText = ({ userName = "", siteUrl = "" }) => {
    const site = (siteUrl || WEBSITE_URL).replace(/\/+$/, "");
    return [
        userName ? `Dear ${userName},` : "Dear Collector,",
        "",
        "Thank you for registering with AKARA for our upcoming auction.",
        "",
        `To complete your registration and enable bidding access, please email a copy of your KYC documents to ${BIDS_EMAIL}.`,
        "",
        "Accepted documents include:",
        ...KYC_DOCUMENTS.map((title) => `- ${title}`),
        "",
        "Our team will review your documents and notify you once your bidding access has been enabled.",
        "",
        `If you have any questions, please contact us at ${AUCTION_EMAIL}`,
        "",
        "Warm regards,",
        "AKARA AUCTIONS",
        GALLERY_ADDRESS,
        `${PHONE} | ${AUCTION_EMAIL}`,
        [WEBSITE_URL, INSTAGRAM_URL].filter(Boolean).join(" | "),
        "",
        `You are receiving this email because you registered on the Akara Auction portal. If you did not initiate this registration, please contact us at ${AUCTION_EMAIL}.`,
        [`Terms of Sale: ${site}/terms`, PRIVACY_POLICY_PATH && `Privacy Policy: ${site}${PRIVACY_POLICY_PATH}`].filter(Boolean).join(" | "),
        `© ${new Date().getFullYear()} Akara. All rights reserved.`,
    ].join("\n");
};
