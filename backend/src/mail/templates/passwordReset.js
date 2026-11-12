import { logoHeaderRow } from "../logo.js";

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// "Reset your password" code — same look as the other Akara emails (otpVerifications.js)
export const passwordResetTemplate = ({ userName = "", otp, expiresInMinutes }) => `
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

                        ${logoHeaderRow()}

                        <!-- Thin gold divider -->
                        <tr>
                            <td style="padding: 40px 60px 0 60px;">
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
                            <td align="center" style="padding: 16px 48px 0 48px;">
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    ${userName ? `Hello ${escapeHtml(userName)},` : "Hello,"}<br/>
                                    We received a request to reset the password for your Akara account.
                                    Enter this code on the reset password page to choose a new one.
                                </p>
                            </td>
                        </tr>

                        <!-- Code -->
                        <tr>
                            <td align="center" style="padding: 32px 40px;">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="border: 1px solid #1a1a1a; padding: 16px 40px;">
                                            <span style="font-size: 30px; letter-spacing: 10px; color:#1a1a1a; font-family: Georgia, serif;">
                                                ${escapeHtml(otp)}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Expiry + ignore note -->
                        <tr>
                            <td align="center" style="padding: 0 48px 40px 48px;">
                                <p style="margin:0; font-size: 12px; line-height: 20px; color:#888888;">
                                    This code expires in ${expiresInMinutes} minutes. Do not share it with anyone.<br/>
                                    If you didn't ask to reset your password, you can ignore this email — your password won't change.
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
