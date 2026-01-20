/* Test Email Script
 * Run this to test email configuration independently
 * Usage: node test-email.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'true';
const smtpUser = (process.env.SMTP_USER || 'productanalyst.pushpa@kauveryhospital.com').trim();
const smtpPass = (process.env.SMTP_PASS || 'fprg nbfn ftat hngt').trim();

console.log('Testing Email Configuration...');
console.log('User:', smtpUser);
console.log('Pass length:', smtpPass.length);
console.log('Pass has spaces:', smtpPass.includes(' '));
console.log('Using env vars:', {
  hasEnvUser: !!process.env.SMTP_USER,
  hasEnvPass: !!process.env.SMTP_PASS
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  tls: {
    rejectUnauthorized
  },
  debug: true
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Verification failed:', error.message);
    console.error('Error code:', error.code);
    if (error.response) {
      console.error('Error response:', error.response);
    }
    process.exit(1);
  } else {
    console.log('✅ SMTP Server is ready!');
    
    // Try sending a test email
    const mailOptions = {
      from: smtpUser,
      to: 'ida@kauveryhospital.com',
      subject: 'Test Email from Kauvery Nalam',
      text: 'This is a test email to verify SMTP configuration.'
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Failed to send test email:', error.message);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        process.exit(0);
      }
    });
  }
});
