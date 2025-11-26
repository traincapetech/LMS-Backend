const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const r2 = require("../config/r2");
const Video = require("../models/Video");
const router = express.Router();



router.get("/:pendingCourseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    // Fetch only title, videoUrl, and duration
    const videos = await Video.find({ courseId }).select("title videoUrl duration");
    if (!videos || videos.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No videos found for this course" });
    }
    res.status(200).json({ success: true, videos });
  } catch (error) {
    console.error("Fetch videos error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch videos", error: error.message });
  }
});
const upload = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE, // ✅ auto-detects correct MIME type
    key: function (req, file, cb) {
      cb(null, `videos/${Date.now()}_${file.originalname}`);
    },
  }),
});

// Post /api/video/upload/:pendingCourseId
router.post("/upload/:pendingCourseId", upload.single("video"), async (req, res) => {
  try {
    const { title, duration } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded" });
    }
    const videoUrl = `${process.env.R2_PUBLIC_BASE_URL}/${req.file.key}`;
    const existingVideo = await Video.findOne({ videoUrl });
    if (existingVideo) {
      return res.status(400).json({ success: false, message: "Video already exists" });
    }
    const newVideo = new Video({
      courseId: req.params.pendingCourseId,
      instructorId: req.user._id,
      title,
      videoUrl,
      duration,
    });
    await newVideo.save();

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      videoUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Video upload failed", error: error.message });
  }
});


module.exports = router;
