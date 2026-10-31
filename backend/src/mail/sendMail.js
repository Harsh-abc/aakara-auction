import mailer from "../config/mail.js";

// "Name <addr>" with the address from MAILGUN_FROM (which may be "Akara <addr>" or just "addr")
const withSenderName = (from, name) => {
    if (!name || !from) return from;
    const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
    return `${name} <${address}>`;
};

// options: { fromName, replyTo, text }
const sendEmail = async (to, subject, html, cc = process.env.MAILGUN_CC, options = {}) => {
    try {
        const mailOptions = {
            from: withSenderName(process.env.MAILGUN_FROM, options.fromName),
            to,
            subject,
            html,
        };
        if (cc) mailOptions.cc = cc;
        if (options.replyTo) mailOptions.replyTo = options.replyTo;
        if (options.text) mailOptions.text = options.text;
        const info = await mailer.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }

}


export default sendEmail;
