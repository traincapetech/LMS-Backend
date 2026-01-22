const Course = require("../models/Course");
const User = require("../models/User");
const { sendGenericEmail } = require("../utils/emailService");
const { uploadToBucket, deleteFromBucket } = require("../config/r2");
const { getRates } = require("../utils/exchangeRate");

exports.getHomeStats = async (req, res) => {
  try {
    const students = await User.countDocuments({ role: "student" });
    const courses = await Course.countDocuments({ published: true });
    const instructors = await User.countDocuments({ role: "instructor" });

    res.json({
      students,
      courses,
      instructors,
    });
  } catch (err) {
    console.error("Error fetching home stats:", err);
    res.status(500).json({ message: "Server error fetching stats." });
  }
};

exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Basic Validation
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ message: "Name, email, and message are required." });
    }

    // Construct Email Content
    const emailSubject = `New Contact Form Submission: ${
      subject || "No Subject"
    }`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Subject:</strong> ${subject || "N/A"}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This email was sent from the Contact Us form on TrainCape LMS.</p>
      </div>
    `;

    // Send Email to Support/Admin
    // Assuming the EMAIL_USER is also the support email or where we want to receive these.
    // If you have a specific support email, replace process.env.EMAIL_USER with that.
    const supportEmail = process.env.EMAIL_USER;

    if (!supportEmail) {
      console.error("EMAIL_USER env variable is not set.");
      return res.status(500).json({
        message: "Server misconfiguration: No support email configured.",
      });
    }

    const emailResult = await sendGenericEmail(
      supportEmail,
      emailSubject,
      htmlContent
    );
    console.log("DEBUG: emailResult type:", typeof emailResult);
    console.log("DEBUG: emailResult content:", JSON.stringify(emailResult));

    // Check if result is truthy AND has success property (handle object return)
    // OR if it's strictly the boolean true (legacy support)
    const isSuccess =
      (emailResult && emailResult.success === true) || emailResult === true;

    if (isSuccess) {
      return res.status(200).json({ message: "Message sent successfully!" });
    } else {
      return res.status(500).json({
        message: "Failed to send message. Please try again later.",
        error: emailResult.error,
      });
    }
  } catch (err) {
    console.error("Error submitting contact form:", err);
    return res
      .status(500)
      .json({ message: "Server error processing your request." });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded." });
    }

    const userId = req.user.id;
    const key = `avatars/${userId}/${Date.now()}_${req.file.originalname}`;

    // Upload to R2 (Images bucket)
    const url = await uploadToBucket(
      req.file.buffer,
      process.env.R2_BUCKET_IMAGES,
      key,
      req.file.mimetype
    );

    // Update user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Delete old avatar if it exists and is on R2
    if (
      user.photoUrl &&
      user.photoUrl.startsWith(process.env.R2_PUBLIC_URL_IMAGES)
    ) {
      const oldKey = user.photoUrl.replace(
        `${process.env.R2_PUBLIC_URL_IMAGES}/`,
        ""
      );
      try {
        await deleteFromBucket(process.env.R2_BUCKET_IMAGES, oldKey);
      } catch (delErr) {
        console.error("Failed to delete old avatar:", delErr);
      }
    }

    user.photoUrl = url;
    await user.save();

    res.json({ success: true, message: "Avatar uploaded successfully.", url });
  } catch (err) {
    console.error("Error uploading avatar:", err);
    res.status(500).json({ message: "Server error uploading avatar." });
  }
};

exports.removeAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.photoUrl) {
      return res.status(400).json({ message: "User has no avatar to remove." });
    }

    // Only try to delete if it's hosted on our R2
    if (user.photoUrl.startsWith(process.env.R2_PUBLIC_URL_IMAGES)) {
      const key = user.photoUrl.replace(
        `${process.env.R2_PUBLIC_URL_IMAGES}/`,
        ""
      );
      await deleteFromBucket(process.env.R2_BUCKET_IMAGES, key);
    }

    user.photoUrl = "";
    await user.save();

    res.json({ success: true, message: "Avatar removed successfully." });
  } catch (err) {
    console.error("Error removing avatar:", err);
    res.status(500).json({ message: "Server error removing avatar." });
  }
};

exports.getExchangeRates = async (req, res) => {
  try {
    const base = (req.query.base || "INR").toUpperCase();
    const symbols = (req.query.symbols || "USD,EUR").toUpperCase();
    const rates = await getRates(base, symbols);
    res.json({ base, rates });
  } catch (err) {
    console.error("Exchange rate error:", err.message);
    res.status(500).json({ message: "Failed to fetch exchange rates" });
  }
};
