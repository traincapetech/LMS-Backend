const nodemailer = require("nodemailer");

// Create transporter with Hostinger SMTP support (or fallback to Gmail)
const createTransporter = () => {
  // Support multiple env naming conventions
  const host =
    process.env.SMTP_HOST || process.env.EMAIL_HOST || process.env.MAIL_HOST;
  const portStr =
    process.env.SMTP_PORT || process.env.EMAIL_PORT || process.env.MAIL_PORT;
  const user =
    process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER;
  const pass =
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASSWORD ||
    process.env.MAIL_PASSWORD ||
    process.env.MAIL_PASS;
  const secureStr =
    process.env.SMTP_SECURE ||
    process.env.EMAIL_SECURE ||
    process.env.MAIL_SECURE;
  const rejectUnauthorizedStr =
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED ||
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED ||
    process.env.MAIL_TLS_REJECT_UNAUTHORIZED;

  // Prefer explicit SMTP configuration if provided (e.g., Hostinger)
  if (host && user && pass) {
    const port = Number(portStr || 587);
    const secure =
      String(secureStr || "").toLowerCase() === "true" || port === 465;
    const rejectUnauthorized =
      String(rejectUnauthorizedStr || "true").toLowerCase() === "true";
    console.log(
      `📨 Using SMTP transporter: host=${host}, port=${port}, secure=${secure}`
    );
    console.log("📨 SMTP auth user:", user);
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      requireTLS: !secure,
      tls: { rejectUnauthorized },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });
  }

  // Fallback to Gmail App Password configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error(
      "❌ Email configuration missing: set SMTP_*/EMAIL_*/MAIL_* or EMAIL_USER/EMAIL_PASSWORD"
    );
    return null;
  }

  console.log("📨 Using Gmail transporter via EMAIL_USER/EMAIL_PASSWORD");
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
};

// Send OTP email with better error handling
const sendOtpEmail = async (email, otp, purpose = "verification") => {
  try {
    console.log("generate otp : ", otp);

    console.log(`📧 Attempting to send OTP to: ${email}`);
    const fromAddress =
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      process.env.MAIL_USER;
    console.log(`🔧 From address: ${fromAddress}`);

    const transporter = createTransporter();

    if (!transporter) {
      console.error(
        "❌ Email transporter not created - check environment variables"
      );
      return false;
    }

    // Verify connection first
    try {
      await transporter.verify();
      console.log("✅ Email connection verified successfully");
    } catch (verifyError) {
      console.error(
        "❌ Email connection verification failed:",
        verifyError.message
      );
      return false;
    }

    const subject =
      purpose === "password-reset"
        ? "Password Reset OTP - Traincape LMS"
        : "Email Verification OTP - Traincape LMS";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Traincape LMS</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px; text-align: center;">
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

    const fromName =
      process.env.SMTP_FROM_NAME ||
      process.env.EMAIL_FROM_NAME ||
      process.env.MAIL_FROM_NAME ||
      "Traincape LMS";
    const fromHeader = /<.*>/.test(fromAddress)
      ? fromAddress
      : `${fromName} <${fromAddress}>`;

    const mailOptions = {
      from: fromHeader,
      to: email,
      subject,
      text: `Your ${
        purpose === "password-reset" ? "password reset" : "verification"
      } OTP is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: htmlContent,
      envelope: {
        from: fromAddress,
        to: email,
      },
      headers: {
        "X-Entity-Ref-ID": String(Date.now()),
      },
    };

    console.log("📨 Sending email with options:", {
      to: mailOptions.to,
      from: mailOptions.from,
      subject,
    });
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);

    // Provide specific troubleshooting based on error type
    if (error.message.includes("Invalid login")) {
      console.log("\n🔧 Gmail Authentication Fix:");
      console.log(
        "1. Enable 2-Step Verification: https://myaccount.google.com/security"
      );
      console.log(
        "2. Generate App Password: https://myaccount.google.com/apppasswords"
      );
      console.log(
        "3. Use the 16-character App Password (not regular password)"
      );
      console.log("4. Make sure EMAIL_USER is your full Gmail address");
    } else if (error.message.includes("ECONNECTION")) {
      console.log("\n🔧 Network Connection Issue:");
      console.log("1. Check your internet connection");
      console.log("2. Try again in a few minutes");
    } else if (error.message.includes("ENOTFOUND")) {
      console.log("\n🔧 DNS Resolution Issue:");
      console.log("1. Check your internet connection");
      console.log("2. Try again later");
    }

    return false;
  }
};

// Generic email sender
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.error(
        "❌ Email transporter not created - check environment variables"
      );
      return false;
    }

    const fromAddress =
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      process.env.MAIL_USER;
    const fromName =
      process.env.SMTP_FROM_NAME ||
      process.env.EMAIL_FROM_NAME ||
      process.env.MAIL_FROM_NAME ||
      "Traincape LMS";
    const fromHeader = /<.*>/.test(fromAddress)
      ? fromAddress
      : `${fromName} <${fromAddress}>`;

    const mailOptions = {
      from: fromHeader,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ""), // Fallback text generation
      html,
      envelope: {
        from: fromAddress,
        to,
      },
    };

    console.log(`📨 Sending generic email to: ${to}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Email sent successfully to ${to}, Message ID: ${result.messageId}`
    );
    return true;
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error.message);
    return false;
  }
};


const sendGenericEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = createTransporter();


    if (!transporter) {
      console.error(
        "❌ Email transporter not created - check environment variables"
      );
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: htmlContent,
    };
    console.log(`📨 Sending generic email to: ${to}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};


module.exports = { sendOtpEmail, sendEmail, sendGenericEmail };
