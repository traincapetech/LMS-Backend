/**
 * Certificate Controller
 *
 * Handles certificate generation with Puppeteer (HTML to PDF)
 *
 * Endpoints:
 * - GET /data/:courseId - Returns certificate data (JSON) for preview
 * - GET /download/:courseId - Returns PDF download
 */

const path = require("path");
const fs = require("fs-extra");
const hbs = require("handlebars");
const puppeteer = require("puppeteer");

const Progress = require("../models/Progress.js");
const Enrollment = require("../models/Enrollment.js");
const Course = require("../models/Course.js");
const User = require("../models/User.js");
const Video = require("../models/Video.js");

/**
 * GET /api/certificate/data/:courseId
 */
exports.getCertificateData = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id || req.user.id;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        message: "You must be enrolled in this course",
      });
    }

    const progress = await Progress.findOne({
      user: userId,
      course: courseId,
    });

    if (!progress || !progress.isCompleted) {
      return res.status(403).json({
        message: "Course must be 100% completed to get certificate",
      });
    }

    const user = await User.findById(userId);
    const course = await Course.findById(courseId).populate("instructor");

    if (!user || !course) {
      return res.status(404).json({ message: "User or course not found" });
    }

    let certificateId = progress.certificateId;
    if (!certificateId) {
      certificateId = `CERT-${String(courseId).slice(-6)}-${String(
        userId
      ).slice(-6)}-${Date.now().toString().slice(-6)}`;
      progress.certificateId = certificateId;
      await progress.save();
    }

    // Calculate duration from Videos
    let totalDuration = 0;
    const videoIds = [];

    if (course.curriculum) {
      course.curriculum.forEach((section) => {
        (section.items || []).forEach((item) => {
          if (item.videoId) {
            videoIds.push(item.videoId);
          }
        });
      });
    }

    if (videoIds.length > 0) {
      const videos = await Video.find({ _id: { $in: videoIds } }).select(
        "duration"
      );
      videos.forEach((video) => {
        totalDuration += video.duration || 0;
      });
    }

    const durationHours =
      totalDuration > 0
        ? (totalDuration / 3600).toFixed(1)
        : progress.timeSpent
        ? (progress.timeSpent / 60).toFixed(1)
        : "10";

    const completionDate = progress.completedAt || new Date();
    const formattedDate = completionDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    res.json({
      success: true,
      certificate: {
        certificateId,
        referenceNumber: String(Date.now()).slice(-4),
        studentName: user.name,
        courseName: course.title || course.landingTitle,
        instructorName: course.instructor
          ? course.instructor.name
          : "Traincape Instructor",
        completionDate: formattedDate,
        courseDuration: `${durationHours} total hours`,
        courseId: courseId,
        courseThumbnail: course.thumbnail || null,
        courseRating: course.averageRating || 4.5,
        courseReviewCount: course.totalReviews || 0,
      },
    });
  } catch (error) {
    console.error("Get certificate data error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * GET /api/certificate/download/:courseId
 *
 * Generates PDF certificate using Puppeteer
 */
exports.downloadCertificate = async (req, res) => {
  let browser = null;

  try {
    const { courseId } = req.params;
    const userId = req.user._id || req.user.id;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        message: "You must be enrolled in this course",
      });
    }

    const progress = await Progress.findOne({
      user: userId,
      course: courseId,
    });

    if (!progress || !progress.isCompleted) {
      return res.status(403).json({
        message: "Course must be 100% completed to download certificate",
      });
    }

    const user = await User.findById(userId);
    const course = await Course.findById(courseId).populate("instructor");

    if (!user || !course) {
      return res.status(404).json({ message: "User or course not found" });
    }

    let certificateId = progress.certificateId;
    if (!certificateId) {
      certificateId = `CERT-${String(courseId).slice(-6)}-${String(
        userId
      ).slice(-6)}-${Date.now().toString().slice(-6)}`;
      progress.certificateId = certificateId;
      await progress.save();
    }

    // Calculate duration from Videos
    let totalDuration = 0;
    const videoIds = [];

    if (course.curriculum) {
      course.curriculum.forEach((section) => {
        (section.items || []).forEach((item) => {
          if (item.videoId) {
            videoIds.push(item.videoId);
          }
        });
      });
    }

    if (videoIds.length > 0) {
      const videos = await Video.find({ _id: { $in: videoIds } }).select(
        "duration"
      );
      videos.forEach((video) => {
        totalDuration += video.duration || 0;
      });
    }

    const durationHours =
      totalDuration > 0
        ? (totalDuration / 3600).toFixed(1)
        : progress.timeSpent
        ? (progress.timeSpent / 60).toFixed(1)
        : "10";

    const completionDate = progress.completedAt || new Date();
    const formattedDate = completionDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const instructorName = course.instructor
      ? course.instructor.name
      : "Traincape Instructor";
    const courseName = course.title || course.landingTitle;

    // Load template
    const templatePath = path.join(
      __dirname,
      "../templates",
      "certificate.hbs"
    );

    if (!fs.existsSync(templatePath)) {
      console.error("Template not found at:", templatePath);
      return res
        .status(500)
        .json({ message: "Certificate template not found" });
    }

    const html = await fs.readFile(templatePath, "utf-8");
    const template = hbs.compile(html);

    // Render HTML with data
    const content = template({
      studentName: user.name,
      courseName: courseName,
      instructorName: instructorName,
      certificateId: certificateId,
      referenceNumber: String(Date.now()).slice(-4),
      completionDate: formattedDate,
      courseDuration: `${durationHours} total hours`,
    });

    console.log("Launching Puppeteer...");

    // Launch Puppeteer with proper Windows settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=842,595",
      ],
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: 842,
      height: 595,
      deviceScaleFactor: 2,
    });

    // Set content with no external resource waiting
    await page.setContent(content, {
      waitUntil: "load",
      timeout: 30000,
    });

    // Small delay to ensure rendering
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log("Generating PDF...");

    // Generate PDF
    const pdfBuffer = await page.pdf({
      width: "842px",
      height: "595px",
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
    });

    await browser.close();
    browser = null;

    console.log("PDF generated, size:", pdfBuffer.length, "bytes");

    // Check if PDF was generated
    if (!pdfBuffer || pdfBuffer.length < 1000) {
      throw new Error("PDF generation failed - buffer too small");
    }

    // Send PDF
    const filename = `Certificate_${
      courseName?.replace(/[^a-z0-9]/gi, "_") || "Course"
    }.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    });

    res.end(pdfBuffer);
  } catch (error) {
    console.error("Certificate download error:", error);

    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error("Error closing browser:", e);
      }
    }

    if (!res.headersSent) {
      res.status(500).json({
        message: "Failed to generate certificate",
        error: error.message,
      });
    }
  }
};
