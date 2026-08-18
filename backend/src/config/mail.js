import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === "true",

    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
    },
});

transporter.verify((error) => {
    if (error) {
        console.error("Mailer connection failed:", error);
    } else {
        console.log("Mailer ready to send emails");
    }
});

export default transporter;