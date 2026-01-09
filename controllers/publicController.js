const Course = require("../models/Course");
const User = require("../models/User");
const { sendGenericEmail } = require("../utils/emailService");

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
      return res
        .status(200)
        .json({  message: "Message sent successfully!" });
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
