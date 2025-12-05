// utils/emailService.js
const { Resend } = require('resend');
const dotenv = require('dotenv');
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const data = await resend.emails.send({
      from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject: subject,
      html: htmlContent,
    });
    console.log(`📧 Email sent to ${to}:`, data.id);
    return data;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return null;
  }
};

module.exports = { sendEmail };