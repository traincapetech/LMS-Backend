<<<<<<< HEAD
const nodemailer = require("nodemailer");

// Create transporter with OAuth2 (more secure)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
=======
const nodemailer = require('nodemailer');

// Create transporter with OAuth2 (more secure)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
>>>>>>> 878743f15c374e032c7f7a0450837315d3cedf02
      user: process.env.EMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: process.env.GMAIL_ACCESS_TOKEN,
    },
  });
};

// Fallback to regular SMTP if OAuth2 not configured
const createFallbackTransporter = () => {
<<<<<<< HEAD
  return nodemailer.createTransport({
    service: "gmail",
=======
  return nodemailer.createTransporter({
    service: 'gmail',
>>>>>>> 878743f15c374e032c7f7a0450837315d3cedf02
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send OTP email
<<<<<<< HEAD
const sendOtpEmail = async (email, otp, purpose = "verification") => {
  try {
    let transporter;

=======
const sendOtpEmail = async (email, otp, purpose = 'verification') => {
  try {
    let transporter;
    
>>>>>>> 878743f15c374e032c7f7a0450837315d3cedf02
    // Try OAuth2 first, fallback to regular SMTP
    if (process.env.GMAIL_CLIENT_ID) {
      transporter = createTransporter();
    } else {
      transporter = createFallbackTransporter();
    }

<<<<<<< HEAD
    const subject =
      purpose === "password-reset"
        ? "Password Reset OTP - Traincape LMS"
        : "Email Verification OTP - Traincape LMS";

=======
    const subject = purpose === 'password-reset' 
      ? 'Password Reset OTP - Traincape LMS'
      : 'Email Verification OTP - Traincape LMS';
    
>>>>>>> 878743f15c374e032c7f7a0450837315d3cedf02
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Traincape LMS</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px; text-align: center;">
<<<<<<< HEAD
            ${
              purpose === "password-reset"
                ? "Password Reset Request"
                : "Email Verification"
            }
          </h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            ${
              purpose === "password-reset"
                ? "You have requested to reset your password. Use the OTP below to complete the process:"
                : "Thank you for registering! Please use the OTP below to verify your email address:"
=======
            ${purpose === 'password-reset' ? 'Password Reset Request' : 'Email Verification'}
          </h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            ${purpose === 'password-reset' 
              ? 'You have requested to reset your password. Use the OTP below to complete the process:'
              : 'Thank you for registering! Please use the OTP below to verify your email address:'
>>>>>>> 878743f15c374e032c7f7a0450837315d3cedf02
            }
          </p>
          
          <div style="background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 5px; font-weight: bold;">${otp}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
            This OTP will expire in 10 minutes for security reasons.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
<<<<<<< HEAD
      html: htmlContent,
=======
      html: htmlContent
>>>>>>> 878743f15c374e032c7f7a0450837315d3cedf02
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${email}`);
    return true;
  } catch (error) {
<<<<<<< HEAD
    console.error("❌ Error sending email:", error.message);
=======
    console.error('❌ Error sending email:', error.message);
>>>>>>> 878743f15c374e032c7f7a0450837315d3cedf02
    return false;
  }
};

<<<<<<< HEAD
const sendGenericEmail = async (to, subject, htmlContent) => {
  try {
    let transporter;

    // Try OAuth2 first, fallback to regular SMTP
    if (process.env.GMAIL_CLIENT_ID) {
      transporter = createTransporter();
    } else {
      transporter = createFallbackTransporter();
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOtpEmail, sendGenericEmail };
=======
module.exports = { sendOtpEmail }; 
>>>>>>> 878743f15c374e032c7f7a0450837315d3cedf02
