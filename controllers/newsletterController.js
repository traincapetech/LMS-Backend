const Newsletter = require("../models/Newsletter");
const { sendEmail } = require("../utils/emailService");

exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const existingSubscriber = await Newsletter.findOne({ email });
    if (existingSubscriber) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already subscribed" });
    }

    const newSubscriber = new Newsletter({ email });
    await newSubscriber.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Successfully subscribed to the newsletter",
      });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.sendNewsletter = async (req, res) => {
  try {
    const { subject, html } = req.body;

    if (!subject || !html) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Subject and content (html) are required",
        });
    }

    // Fetch all subscribers
    const subscribers = await Newsletter.find({});

    if (subscribers.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No subscribers found" });
    }

    // Send emails in parallel (for small lists) or queue them (proper way)
    // For simplicity, we'll use Promise.all but log errors individually

    console.log(
      `Starting newsletter blast to ${subscribers.length} subscribers...`
    );

    let successCount = 0;
    let failureCount = 0;

    const emailPromises = subscribers.map(async (sub) => {
      const success = await sendEmail({
        to: sub.email,
        subject,
        html,
      });

      if (success) successCount++;
      else failureCount++;
    });

    await Promise.all(emailPromises);

    res.json({
      success: true,
      message: `Newsletter sent. Success: ${successCount}, Failed: ${failureCount}`,
      stats: { successCount, failureCount, total: subscribers.length },
    });
  } catch (error) {
    console.error("Newsletter send error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error sending newsletter" });
  }
};

exports.getSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort({ subscribedAt: -1 });
    res.json({ success: true, count: subscribers.length, subscribers });
  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const subscriber = await Newsletter.findOneAndDelete({ email });
    if (!subscriber) {
      return res
        .status(404)
        .json({ success: false, message: "Subscriber not found" });
    }

    res.json({ success: true, message: "Successfully unsubscribed" });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
