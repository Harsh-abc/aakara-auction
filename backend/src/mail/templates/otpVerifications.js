export const otpVerificationTemplate = (otp, userName = "") => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email</title>
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
                                    Verify Your Email
                                </h1>
                            </td>
                        </tr>

                        <!-- Greeting -->
                        <tr>
                            <td align="center" style="padding: 8px 48px 0 48px;">
                                <p style="margin:0; font-size: 14px; line-height: 22px; color:#555555;">
                                    ${userName ? `Hello ${userName},` : "Hello,"}<br/>
                                    Use the verification code below to complete your request.
                                </p>
                            </td>
                        </tr>

                        <!-- OTP Box -->
                        <tr>
                            <td align="center" style="padding: 32px 40px;">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="border: 1px solid #1a1a1a; padding: 16px 40px;">
                                            <span style="font-size: 30px; letter-spacing: 10px; color:#1a1a1a; font-family: Georgia, serif;">
                                                ${otp}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Expiry note -->
                        <tr>
                            <td align="center" style="padding: 0 48px 8px 48px;">
                                <p style="margin:0; font-size: 13px; color:#999999;">
                                    This code will expire in 10 minutes.
                                </p>
                            </td>
                        </tr>

                        <!-- Security note -->
                        <tr>
                            <td align="center" style="padding: 24px 48px 40px 48px;">
                                <p style="margin:0; font-size: 12px; line-height: 20px; color:#aaaaaa;">
                                    If you did not request this code, you can safely ignore this email.
                                    Do not share this code with anyone.
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
};