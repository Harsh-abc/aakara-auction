import transporter from "../config/mail.js";

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM,
            to,
            subject,
            html,
        };
        const info = await transporter.sendMail(mailOptions);
        return info;
        console.log("Email sent:", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }

}


export default sendEmail;