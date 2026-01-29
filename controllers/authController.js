const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../utils/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate Verification OTP
    const verificationOtp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "student",
      isVerified: false,
      verificationOtp,
    });

    await user.save();

    // Send Verification Email
    await sendOtpEmail(email, verificationOtp, "email-verification");

    return res.status(201).json({
      message: "Signup successful. Please verify your email.",
      success: true,
      requireVerification: true,
      email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("=== BACKEND LOGIN DEBUG ===");
    console.log("Login attempt for email:", email);

    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({ message: "All fields are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if (!user.isVerified) {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationOtp = otp;
      user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
      await user.save();
      if (user.resetOtpExpires < Date.now()) {
        return res.status(400).json({ message: "OTP expired." });
      }
      // Send OTP via email
      const emailSent = await sendOtpEmail(email, otp, "email-verification");
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send OTP email." });
      }
      return res.status(403).json({
        message: "Please verify your email first.",
        requireVerification: true,
      });
    }

    console.log("User found:", user.email, "Role:", user.role);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for user:", email);
      return res.status(400).json({ message: "Invalid credentials." });
    }

    console.log("Password verified successfully");

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log("Token generated, length:", token.length);
    console.log("Token preview:", token.substring(0, 20) + "...");

    const responseData = {
      token,
      user: { name: user.name, email: user.email, role: user.role },
    };
    console.log("Sending response with token");

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// Forgot Password: Send OTP
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("\n[AUTH] /forgot-password called");
  console.log("[AUTH] Payload:", { email });
  if (!email) {
    console.log("[AUTH] Missing email");
    return res.status(400).json({ message: "Email is required." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("[AUTH] User not found for email:", email);
      return res.status(404).json({ message: "User not found." });
    }
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("[AUTH] Generated OTP (masked): ****** for", email);
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
    await user.save();

    // Send OTP via email
    console.log("[AUTH] Sending OTP email...");
    const emailSent = await sendOtpEmail(email, otp, "password-reset");

    if (!emailSent) {
      // Development fallback: allow testing without email credentials
      if (process.env.NODE_ENV !== "production") {
        console.log("🔧 DEV MODE: Password reset OTP for", email, "is", otp);
        return res.status(200).json({
          message: "OTP sent (dev mode). Check server logs for the code.",
        });
      }
      console.log("[AUTH] Failed to send OTP email");
      return res
        .status(500)
        .json({ message: "Failed to send OTP email. Please try again." });
    }

    console.log("[AUTH] OTP email dispatched successfully");
    return res.status(200).json({ message: "OTP sent to your email." });
  } catch (err) {
    console.error("[AUTH] forgotPassword error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// Verify OTP (for password reset)
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }
    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP." });
    }
    if (user.resetOtpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired." });
    }
    user.otpVerifiedForReset = true;
    await user.save();

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// Reset Password: Only allow if OTP was verified
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  console.log("\n[AUTH] /reset-password called");
  console.log("[AUTH] Payload:", {
    email,
    newPassword: newPassword ? "******" : undefined,
  });
  if (!email || !newPassword) {
    console.log("[AUTH] Missing email or newPassword");
    return res.status(400).json({ message: "All fields are required." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user || !user.otpVerifiedForReset) {
      console.log("[AUTH] OTP not verified for", email);
      return res.status(400).json({ message: "OTP not verified." });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.otpVerifiedForReset = undefined;
    await user.save();
    console.log("[AUTH] Password reset completed for", email);
    return res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error("[AUTH] resetPassword error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    console.log("initial otp", user)

    if (user.isVerified) {
      return res
        .status(200)
        .json({ message: "Email already verified. Please login." });
    }

    if (user.verificationOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    user.isVerified = true;
    user.verificationOtp = undefined; // Clear OTP after usage
    user.verificationOtpExpires = undefined;
    await user.save();

    return res
      .status(200)
      .json({ message: "Email verified successfully. You can now login." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.resendVerificationOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isVerified) {
      return res
        .status(200)
        .json({ message: "Email already verified. Please login." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationOtp = otp;
    user.verificationOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const emailSent = await sendOtpEmail(email, otp, "email-verification");
    if (!emailSent) {
      return res
        .status(500)
        .json({ message: "Failed to send verification OTP." });
    }

    return res.status(200).json({ message: "Verification OTP sent." });
  } catch (err) {
    console.error("resendVerificationOtp error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// Change password (requires auth – user from requireAuth middleware)
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = req.user;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  try {
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// Close account (requires auth – user from requireAuth middleware)
exports.closeAccount = async (req, res) => {
  const { password } = req.body;
  const user = req.user;

  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password." });
    }

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({ message: "Account closed successfully." });
  } catch (err) {
    console.error("closeAccount error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};
