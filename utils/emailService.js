const nodemailer = require('nodemailer');

// Create transporter with Hostinger SMTP configuration
const createTransporter = () => {
  // Check if we have OAuth2 credentials (for Gmail fallback)
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER || 'sales@traincapetech.in',
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: process.env.GMAIL_ACCESS_TOKEN
      }
    });
  }
  
  // Hostinger SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'sales@traincapetech.in',
      pass: process.env.EMAIL_PASSWORD || 'Canada@1212'
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send OTP email
const sendOtpEmail = async (email, otp, purpose = 'verification') => {
  try {
    const transporter = createTransporter();
    
    // Verify transporter configuration
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');
    
    const subject = purpose === 'password-reset' 
      ? 'Password Reset OTP - Traincape LMS'
      : 'Email Verification OTP - Traincape LMS';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Traincape LMS</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px; text-align: center;">
            ${purpose === 'password-reset' ? 'Password Reset Request' : 'Email Verification'}
          </h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            ${purpose === 'password-reset' 
              ? 'You have requested to reset your password. Use the OTP below to complete the process:'
              : 'Thank you for registering! Please use the OTP below to verify your email address:'
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
      from: process.env.EMAIL_USER || 'sales@traincapetech.in',
      to: email,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed. Please check your email credentials.');
      console.error('💡 For Hostinger email setup:');
      console.error('   1. Use your full email address as EMAIL_USER');
      console.error('   2. Use your email password as EMAIL_PASSWORD');
      console.error('   3. Default SMTP settings: smtp.hostinger.com:587');
      console.error('   4. Make sure your email account is active and not suspended');
    }
    
    return false;
  }
};

module.exports = { sendOtpEmail }; 