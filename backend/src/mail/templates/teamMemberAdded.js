import {
    AUCTION_EMAIL,
    emailLayout,
    escapeHtml,
    link,
    siteBase,
    textFooter,
} from "./registrationReceived.js";

export const TEAM_MEMBER_ADDED_SUBJECT = "Welcome to the AKARA Team | Your Dashboard Access";
const PREHEADER = "You have been added to the AKARA AUCTIONS team. Your login details are inside.";

// what each dashboard role is for, in the words the team uses (frontend/lib/constants/roles.ts)
const ROLE_DETAILS = {
    SUPER_ADMIN: {
        label: "Super Admin",
        summary: "Full access to the dashboard, including the team, roles and all settings.",
    },
    ADMIN: {
        label: "Admin",
        summary: "Manage auctions, lots, artworks, bidders and users, and run live auctions.",
    },
    OPERATIONS: {
        label: "Operations",
        summary: "Look after auctions, lots, artworks and bidders day to day.",
    },
    AUCTIONEER: {
        label: "Auctioneer",
        summary: "Run live auctions from the bidding console: start lots, take floor bids and hammer.",
    },
};

const roleDetails = (roleName) =>
    ROLE_DETAILS[roleName] ?? { label: String(roleName).replace(/_/g, " ").toLowerCase(), summary: "" };

const loginUrl = (site) => `${site}/registration?redirect=${encodeURIComponent("/dashboard")}`;

const detailRows = ({ email, password, roleName, addedBy }) => [
    ["Role", roleDetails(roleName).label],
    ["Email", email],
    ["Password", password],
    ...(addedBy ? [["Added by", addedBy]] : []),
];

// the beige box of label / value rows, as in the registration admin email
const detailsBox = (title, rows) => `
                        <tr>
                            <td style="padding: 24px 48px 0 48px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbeedc;">
                                    <tr>
                                        <td style="padding: 12px 24px;">
                                            <p style="margin:8px 0 4px 0; font-size: 11px; letter-spacing: 1.5px; color:#1a1a1a; text-transform: uppercase;">
                                                ${escapeHtml(title)}
                                            </p>
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                ${rows.map(([rowLabel, value]) => `
                                                <tr>
                                                    <td style="padding: 8px 0; width: 110px; font-size: 11px; letter-spacing: 1.5px; color:#999999; text-transform: uppercase; vertical-align: top;">${escapeHtml(rowLabel)}</td>
                                                    <td style="padding: 8px 0; font-size: 14px; line-height: 22px; color:#1a1a1a; word-break: break-all;">${rowLabel === "Password"
        ? `<span style="font-family: 'Courier New', Courier, monospace; font-size: 15px; letter-spacing: 1px;">${escapeHtml(value)}</span>`
        : escapeHtml(value)}</td>
                                                </tr>`).join("")}
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>`;

const loginButton = (site) => `
                        <tr>
                            <td align="center" style="padding: 32px 40px 8px 40px;">
                                <a href="${escapeHtml(loginUrl(site))}" style="display:inline-block; background-color:#1a1a1a; color:#ffffff; padding: 14px 32px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration:none;">
                                    Log in to the dashboard
                                </a>
                            </td>
                        </tr>`;

// sent when a Super Admin adds a team member (Settings → Team → Add Team Member)
export const teamMemberAddedTemplate = ({ userName = "", email, password, roleName, addedBy = "", siteUrl = "" }) => {
    const site = siteBase(siteUrl);
    const { label, summary } = roleDetails(roleName);
    const greeting = userName ? `Dear ${escapeHtml(userName)},` : "Hello,";

    const content = `
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                    ${greeting}
                                </p>
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    You have been added to the AKARA AUCTIONS team as
                                    <span style="color:#1a1a1a;">${escapeHtml(label)}</span>.
                                    ${summary ? escapeHtml(summary) : ""}
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Your account is ready. Use the details below to log in to the dashboard.
                                </p>
                            </td>
                        </tr>

                        ${detailsBox("Your login details", detailRows({ email, password, roleName, addedBy }))}

                        ${loginButton(site)}

                        <!-- First login -->
                        <tr>
                            <td style="padding: 24px 48px 32px 48px;">
                                <p style="margin:0 0 10px 0; font-size: 11px; letter-spacing: 1.5px; color:#1a1a1a; text-transform: uppercase;">
                                    On your first login
                                </p>
                                <ul style="margin:0 0 16px 0; padding-left: 20px; font-size: 14px; line-height: 22px; color:#555555;">
                                    <li style="margin: 0 0 6px 0;">You will be asked to set up Google Authenticator. Keep the app on your phone, as the dashboard asks for a code when you log in.</li>
                                    <li style="margin: 0 0 6px 0;">For your security, change this password using ${link(`${site}/forgot-password`, "Forgot password")}.</li>
                                    <li style="margin: 0;">Please do not share these details or forward this email.</li>
                                </ul>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    If you were not expecting this, please contact us at ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}.
                                </p>
                            </td>
                        </tr>`;

    return emailLayout({
        site,
        heading: "Welcome to the Team",
        eyebrow: "AKARA AUCTIONS &middot; Dashboard Access",
        preheader: PREHEADER,
        content,
        registrantNotice: false,
        banner: false,
    });
};

// plain-text part, for clients that don't show HTML (and better deliverability)
export const teamMemberAddedText = ({ userName = "", email, password, roleName, addedBy = "", siteUrl = "" }) => {
    const site = siteBase(siteUrl);
    const { label, summary } = roleDetails(roleName);
    return [
        userName ? `Dear ${userName},` : "Hello,",
        "",
        `You have been added to the AKARA AUCTIONS team as ${label}.${summary ? ` ${summary}` : ""}`,
        "",
        "Your account is ready. Use the details below to log in to the dashboard.",
        "",
        ...detailRows({ email, password, roleName, addedBy }).map(([rowLabel, value]) => `${rowLabel}: ${value}`),
        "",
        `Log in: ${loginUrl(site)}`,
        "",
        "On your first login:",
        "- You will be asked to set up Google Authenticator. Keep the app on your phone, as the dashboard asks for a code when you log in.",
        `- For your security, change this password using Forgot password: ${site}/forgot-password`,
        "- Please do not share these details or forward this email.",
        "",
        `If you were not expecting this, please contact us at ${AUCTION_EMAIL}.`,
        "",
        ...textFooter(site, false),
    ].join("\n");
};

