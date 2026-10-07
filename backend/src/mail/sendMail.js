import mailer from "../config/mail.js";

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.MAILGUN_FROM,
            to,
            subject,
            html,
        };
        const info = await mailer.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }

}


export default sendEmail;