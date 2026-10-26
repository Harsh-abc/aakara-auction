const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// "Reset your password" — same look as the other Akara emails (kycDocumentsRequested.js)
export const passwordResetTemplate = ({ userName = "", resetUrl, expiresInMinutes }) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset your password</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f5f5f3; font-family: Georgia, 'Times New Roman', serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f3; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border: 1px solid #e5e4e0;">

                        <!-- Logo -->
                        <tr>
                            <td align="center" style="padding: 48px 40px 24px 40px;">
                                <img src="https://akaraart.com/img/logo.png" width="180" height="48" alt="Akara" style="display:block;" />
                            </td>
                        </tr>

                        <!-- Thin gold divider -->
                        <tr>
                            <td style="padding: 0 60px;">
                                <div style="border-top: 1px solid #c9a44c; width: 40px; margin: 0 auto;"></div>
                            </td>
                        </tr>

                        <!-- Heading -->
                        <tr>
                            <td align="center" style="padding: 32px 40px 8px 40px;">
                                <h1 style="margin:0; font-size: 22px; font-weight: 400; letter-spacing: 1px; color:#1a1a1a; text-transform: uppercase;">
                                    Reset your password
                                </h1>
                            </td>
                        </tr>

                        <!-- Message -->
                        <tr>
                            <td style="padding: 16px 48px 0 48px;">
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    ${userName ? `Hello ${escapeHtml(userName)},` : "Hello,"}<br/>
                                    We received a request to reset the password for your Akara account.
                                    Click the button below to choose a new one.
                                </p>
                            </td>
                        </tr>

                        <!-- Button -->
                        <tr>
                            <td align="center" style="padding: 32px 40px 24px 40px;">
                                <a href="${escapeHtml(resetUrl)}" style="display:inline-block; background-color:#1a1a1a; color:#ffffff; padding: 14px 32px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration:none;">
                                    Reset password
                                </a>
                            </td>
                        </tr>

                        <!-- Expiry + ignore note -->
                        <tr>
                            <td style="padding: 0 48px 32px 48px;">
                                <p style="margin:0; font-size: 12px; line-height: 20px; color:#888888; text-align:center;">
                                    This link expires in ${expiresInMinutes} minutes and can be used once.<br/>
                                    If you didn't ask to reset your password, you can ignore this email — your password won't change.
                                </p>
                            </td>
                        </tr>

                        <!-- Fallback link -->
                        <tr>
                            <td style="padding: 0 48px 32px 48px;">
                                <p style="margin:0; font-size: 11px; line-height: 18px; color:#999999; word-break: break-all;">
                                    Button not working? Paste this link into your browser:<br/>
                                    <a href="${escapeHtml(resetUrl)}" style="color:#999999;">${escapeHtml(resetUrl)}</a>
                                </p>
                            </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                            <td style="border-top: 1px solid #efeeec; padding-top: 24px;"></td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding: 24px 40px 40px 40px;">
                                <p style="margin:0 0 6px 0; font-size: 11px; letter-spacing: 1.5px; color:#999999; text-transform: uppercase;">
                                    Akara
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
