const nodemailer = require("nodemailer")

const sendEmail = async (data, req, res) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    async function main() {
        const info = await transporter.sendMail({
            from: process.env.EMAIL,
            to: data.to,
            subject: data.subject,
            text: data.text,
            html: data.html
        });
    }
    main().catch(console.error)
}

module.exports = sendEmail