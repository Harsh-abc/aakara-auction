import Mailgun from "mailgun.js";

const domain = process.env.MAILGUN_DOMAIN;

const mg = new Mailgun(FormData).client({
    username: "api",
    key: process.env.MAILGUN_API_KEY,
    url: process.env.MAILGUN_URL || "https://api.mailgun.net",
});

mg.domains.get(domain)
    .then((info) => console.log(`Mailer ready to send emails via Mailgun (${domain}, ${info.state})`))
    .catch((error) => console.error("Mailer connection failed:", error));

const mailer = {
    sendMail: async ({ from, to, cc, bcc, replyTo, subject, html, text }) => {
        const message = { from, to, subject, html };
        if (text) message.text = text;
        if (cc) message.cc = cc;
        if (bcc) message.bcc = bcc;
        if (replyTo) message["h:Reply-To"] = replyTo;
        const res = await mg.messages.create(domain, message);
        return { ...res, messageId: res.id };
    },
};

export default mailer;
