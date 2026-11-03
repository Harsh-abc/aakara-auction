import {
    AUCTION_EMAIL,
    emailLayout,
    escapeHtml,
    link,
    siteBase,
    textFooter,
} from "./registrationReceived.js";

// same inline banner as the registration emails
export { REGISTRATION_INLINE_IMAGES as TEAM_MEMBER_INLINE_IMAGES } from "./registrationReceived.js";

export const TEAM_MEMBER_ADDED_SUBJECT = "Welcome to the Akara Team | Your Dashboard Access";
export const TEAM_ROLE_CHANGED_SUBJECT = "Akara Team | Your Role Has Been Updated";
export const TEAM_ACCESS_REVOKED_SUBJECT = "Akara Team | Your Dashboard Access Has Been Removed";
const PREHEADER = "You have been added to the Akara Auctions team. Your login details are inside.";

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
    // not team roles — they only show as the "Previous role" when someone joins or leaves the team
    BIDDER: { label: "Bidder", summary: "" },
    USER: { label: "Website user", summary: "" },
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

const formatIst = (date) =>
    new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";

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
                                    You have been added to the AKARA Auctions team as
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
        eyebrow: "Akara Auctions &middot; Dashboard Access",
        preheader: PREHEADER,
        content,
        registrantNotice: false,
    });
};

// plain-text part, for clients that don't show HTML (and better deliverability)
export const teamMemberAddedText = ({ userName = "", email, password, roleName, addedBy = "", siteUrl = "" }) => {
    const site = siteBase(siteUrl);
    const { label, summary } = roleDetails(roleName);
    return [
        userName ? `Dear ${userName},` : "Hello,",
        "",
        `You have been added to the AKARA Auctions team as ${label}.${summary ? ` ${summary}` : ""}`,
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

// ── Role changed ─────────────────────────────────────
// sent when a Super Admin moves someone to another dashboard role (Settings → Team → Role),
// or gives an existing website user / bidder a dashboard role
const roleChangeRows = ({ oldRoleName, newRoleName, changedBy, changedAt }) => [
    ["Previous role", roleDetails(oldRoleName).label],
    ["New role", roleDetails(newRoleName).label],
    ...(changedBy ? [["Changed by", changedBy]] : []),
    ["Changed on", formatIst(changedAt ?? new Date())],
];

export const teamRoleChangedTemplate = ({ userName = "", siteUrl = "", ...change }) => {
    const site = siteBase(siteUrl);
    const { label, summary } = roleDetails(change.newRoleName);
    const greeting = userName ? `Dear ${escapeHtml(userName)},` : "Hello,";

    const content = `
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                    ${greeting}
                                </p>
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Your role on the AKARA Auctions team has been updated to
                                    <span style="color:#1a1a1a;">${escapeHtml(label)}</span>.
                                    ${summary ? escapeHtml(summary) : ""}
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    You have been logged out of all devices. Please log in again with your existing
                                    email and password to continue with your new role.
                                </p>
                            </td>
                        </tr>

                        ${detailsBox("Role update", roleChangeRows(change))}

                        ${loginButton(site)}

                        <tr>
                            <td style="padding: 24px 48px 32px 48px;">
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    If you were not expecting this change, please contact us at ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}.
                                </p>
                            </td>
                        </tr>`;

    return emailLayout({
        site,
        heading: "Your Role Has Been Updated",
        eyebrow: "Akara Auctions &middot; Dashboard Access",
        preheader: `Your role on the Akara Auctions team is now ${escapeHtml(label)}.`,
        content,
        registrantNotice: false,
    });
};

export const teamRoleChangedText = ({ userName = "", siteUrl = "", ...change }) => {
    const site = siteBase(siteUrl);
    const { label, summary } = roleDetails(change.newRoleName);
    return [
        userName ? `Dear ${userName},` : "Hello,",
        "",
        `Your role on the AKARA Auctions team has been updated to ${label}.${summary ? ` ${summary}` : ""}`,
        "",
        "You have been logged out of all devices. Please log in again with your existing email and password to continue with your new role.",
        "",
        ...roleChangeRows(change).map(([rowLabel, value]) => `${rowLabel}: ${value}`),
        "",
        `Log in: ${loginUrl(site)}`,
        "",
        `If you were not expecting this change, please contact us at ${AUCTION_EMAIL}.`,
        "",
        ...textFooter(site, false),
    ].join("\n");
};

// ── Access revoked ───────────────────────────────────
// sent when a Super Admin revokes someone's dashboard access (Settings → Team → Role → Revoke access)
const revokedRows = ({ oldRoleName, changedBy, changedAt }) => [
    ["Previous role", roleDetails(oldRoleName).label],
    ...(changedBy ? [["Removed by", changedBy]] : []),
    ["Removed on", formatIst(changedAt ?? new Date())],
];

export const teamAccessRevokedTemplate = ({ userName = "", siteUrl = "", ...change }) => {
    const site = siteBase(siteUrl);
    const { label } = roleDetails(change.oldRoleName);
    const greeting = userName ? `Dear ${escapeHtml(userName)},` : "Hello,";

    const content = `
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px 48px 0 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#1a1a1a;">
                                    ${greeting}
                                </p>
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Your <span style="color:#1a1a1a;">${escapeHtml(label)}</span> role on the AKARA Auctions team
                                    has been removed, and you no longer have access to the dashboard.
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    You have been logged out of all devices. Your account remains active on the
                                    ${link(site, "Akara website")}, where you can continue to browse our auctions.
                                </p>
                            </td>
                        </tr>

                        ${detailsBox("Access update", revokedRows(change))}

                        <tr>
                            <td style="padding: 24px 48px 32px 48px;">
                                <p style="margin:0 0 16px 0; font-size: 14px; line-height: 22px; color:#555555;">
                                    Thank you for your work with the Akara team.
                                </p>
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    If you believe this was a mistake, please contact us at ${link(`mailto:${AUCTION_EMAIL}`, AUCTION_EMAIL)}.
                                </p>
                            </td>
                        </tr>`;

    return emailLayout({
        site,
        heading: "Dashboard Access Removed",
        eyebrow: "Akara Auctions &middot; Dashboard Access",
        preheader: "Your access to the Akara Auctions dashboard has been removed.",
        content,
        registrantNotice: false,
    });
};

export const teamAccessRevokedText = ({ userName = "", siteUrl = "", ...change }) => {
    const site = siteBase(siteUrl);
    const { label } = roleDetails(change.oldRoleName);
    return [
        userName ? `Dear ${userName},` : "Hello,",
        "",
        `Your ${label} role on the AKARA Auctions team has been removed, and you no longer have access to the dashboard.`,
        "",
        `You have been logged out of all devices. Your account remains active on the Akara website (${site}), where you can continue to browse our auctions.`,
        "",
        ...revokedRows(change).map(([rowLabel, value]) => `${rowLabel}: ${value}`),
        "",
        "Thank you for your work with the Akara team.",
        "",
        `If you believe this was a mistake, please contact us at ${AUCTION_EMAIL}.`,
        "",
        ...textFooter(site, false),
    ].join("\n");
};
