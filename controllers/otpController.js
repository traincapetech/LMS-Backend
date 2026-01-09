const Instructor = require("../models/Instructor");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { sendOtpEmail } = require("../utils/emailService");

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// 📩 Send OTP
const sendOtp = async (req, res) => {
  const { fullName, email, isSubscribed } = req.body;
  console.log("data : ", fullName)
  if (!fullName || !email) {
    return res.status(400).json({ message: "Full name and email are required." });
  }

  try {
    const otp = generateOtp();

    // Send OTP via email
    const emailSent = await sendOtpEmail(email, otp, 'verification');
    
    if (!emailSent) {
      return res.status(500).json({ message: " Failed to send OTP email. Please try again." });
    }

    const instructor = await Instructor.findOneAndUpdate(
      { email },
      { fullName, email, isSubscribed, otp, isVerified: false },
      { upsert: true, new: true }
    );

    
    return res.status(200).json({ message: "OTP sent successfully to your email" });
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Verify OTP
const verifyOtp = async (req, res) => {
  const { email, enteredOtp } = req.body;

  if (!email || !enteredOtp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const instructor = await Instructor.findOne({ email });

    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found." });
    }

    if (instructor.otp !== enteredOtp) {
      return res.status(400).json({ message: "Incorrect OTP." });
    }

    instructor.isVerified = true;
    instructor.otp = undefined; // Clear OTP after verification
    await instructor.save();

    // Create or update User as instructor
    let user = await User.findOne({ email });
    if (!user) {
      // Use instructor.fullName or instructor.name
      const name = instructor.fullName || instructor.name || "Instructor";
      // Generate a random password (since required, but not used for OTP flow)
      const randomPassword = Math.random().toString(36).slice(-8) + Date.now();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = new User({
        name,
        email,
        password: hashedPassword,
        role: "instructor",
      });
      await user.save();
    } else if (user.role !== "instructor") {
      user.role = "instructor";
      await user.save();
    }

    return res.status(200).json({ message: "OTP verified successfully", user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { sendOtp, verifyOtp };