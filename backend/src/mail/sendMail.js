import mailer from "../config/mail.js";
import { LOGO_FILENAME, LOGO_INLINE_IMAGE } from "./logo.js";

// "Name <addr>" with the address from MAILGUN_FROM (which may be "Akara <addr>" or just "addr")
const withSenderName = (from, name) => {
    if (!name || !from) return from;
    const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
    return `${name} <${address}>`;
};

// every email goes out as "AKARA AUCTIONS" unless a caller overrides fromName
const DEFAULT_FROM_NAME = "AKARA AUCTIONS";

// options: { fromName, fromAddress (instead of MAILGUN_FROM), replyTo, text, inline }
const sendEmail = async (to, subject, html, cc = process.env.MAILGUN_CC, options = {}) => {
    try {
        const mailOptions = {
            from: withSenderName(options.fromAddress || process.env.MAILGUN_FROM, options.fromName || DEFAULT_FROM_NAME),
            to,
            subject,
            html,
        };
        if (cc) mailOptions.cc = cc;
        if (options.replyTo) mailOptions.replyTo = options.replyTo;
        if (options.text) mailOptions.text = options.text;
        const inline = [...(options.inline ?? [])];
        // every template shows the logo as cid:aakara_white.png — attach it once if the html uses it
        if (html?.includes(`cid:${LOGO_FILENAME}`) && !inline.some((image) => image.filename === LOGO_FILENAME)) {
            inline.push(LOGO_INLINE_IMAGE);
        }
        if (inline.length) mailOptions.inline = inline;
        const info = await mailer.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }

}


export default sendEmail;
