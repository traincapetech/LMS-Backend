// routes/upload.js
const express = require('express');
const multer = require('multer');
const router = express.Router();

const PendingCourse = require('../models/PendingCourse');
const Video = require('../models/Video');


const { uploadToBucket } = require('../config/r2.js');

// Multer memory storage (required for R2)
const upload = multer({ storage: multer.memoryStorage() });


router.get("/check/:pendingCourseId", async (req, res) => {
  try {
    const { pendingCourseId } = req.params;

    const course = await PendingCourse.findById( pendingCourseId);
    const videos = await Video.find({ pendingCourseId });

    return res.json({
      success: true,
      courseCurriculum: course.curriculum,
      uploadedVideos: videos
    });

  } catch (err) {
    console.error("Check error:", err);
    res.status(500).json({ message: "Failed to check files", error: err.message });
  }
});

/* ---------------------------------------------------------
   📌 1. UPLOAD THUMBNAIL (Images Bucket)
---------------------------------------------------------- */
//api/upload/thumbnail/:pendingCourseId
router.post('/thumbnail/:pendingCourseId', upload.single('thumbnail'), async (req, res) => {
  try {
    const { pendingCourseId } = req.params;

    if (!req.file)
      return res.status(400).json({ message: "No thumbnail uploaded" });

    // 🧠 Verify user owns the course
    const course = await PendingCourse.findOne({
      _id: pendingCourseId,
      $or: [
        { instructor: req.user.id },
        { "instructor._id": req.user.id }
      ]
    });

    if (!course)
      return res.status(404).json({
        success: false,
        message: "Pending course not found or unauthorized",
      });

    // 🗂 R2 key organized by user + course
    const key = `thumbnails/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname}`;

    // 📤 Upload to R2
    const url = await uploadToBucket(
      req.file.buffer,
      process.env.R2_BUCKET_IMAGES,
      key,
      req.file.mimetype
    );

    // 💾 Save to DB
    course.thumbnailUrl = url;
    await course.save();

    return res.json({
      success: true,
      message: "Thumbnail uploaded successfully",
      thumbnailUrl: url,
    });

  } catch (err) {
    console.error("Thumbnail upload error:", err);
    res.status(500).json({
      success: false,
      message: "Thumbnail upload failed",
      error: err.message,
    });
  }
});

/* ---------------------------------------------------------
   📄 2. UPLOAD DOCUMENTS (Docs Bucket)
---------------------------------------------------------- */
// api/upload/document/:pendingcourseId/:sectionId/:itemId
router.post(
  "/document/:pendingCourseId/:sectionId/:itemId",
  upload.single("file"),
  async (req, res) => {
    try {
      const { pendingCourseId, sectionId, itemId } = req.params;

      if (!req.file)
        return res.status(400).json({ message: "No document uploaded" });

      // Verify course
      const course = await PendingCourse.findOne({
        _id: pendingCourseId,
        $or: [
          { instructor: req.user.id },
          { "instructor._id": req.user.id },
        ],
      });

      if (!course)
        return res.status(404).json({
          success: false,
          message: "Pending course not found or unauthorized",
        });

      // Upload to bucket
      const key = `documents/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname}`;

      const url = await uploadToBucket(
        req.file.buffer,
        process.env.R2_BUCKET_DOCS,
        key,
        req.file.mimetype
      );

      // 🔎 Find section by ID
      const section = course.curriculum.find(
        (sec) => String(sec._id) === String(sectionId)
      );
      if (!section) throw new Error("Section not found");

      // 🔎 Find item by ID
      const item = section.items.find(
        (it) => String(it._id) === String(itemId)
      );
      if (!item) throw new Error("Item not found");

      // Ensure documents array exists
      if (!item.documents) item.documents = [];

      // Save document
      item.documents.push({
        fileUrl: url,
        fileName: req.file.originalname,
      });

      await course.save();

      return res.json({
        success: true,
        message: "Document uploaded successfully",
        document: { fileUrl: url, fileName: req.file.originalname },
      });
    } catch (err) {
      console.error("Document upload error:", err);
      res.status(500).json({
        success: false,
        message: "Document upload failed",
        error: err.message,
      });
    }
  }
);

/* ---------------------------------------------------------
   🎬 3. UPLOAD VIDEO (Videos Bucket)
---------------------------------------------------------- */
//api/upload/videos/:pendingCourseId
router.post('/videos/:pendingCourseId',  upload.single('video'),  async (req, res) => {
    try {
      const pendingCourseId = req.params.pendingCourseId;

      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      // Verify user owns the course
      const course = await PendingCourse.findOne({
        _id: pendingCourseId,
        $or: [
          { instructor: req.user.id },
          { "instructor._id": req.user.id }
        ]
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Pending course not found or unauthorized"
        });
      }

      const key = `videos/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname}`;

      const url = await uploadToBucket(
        req.file.buffer,
        process.env.R2_BUCKET_VIDEOS,  // ⭐ Correct bucket
        key,
        req.file.mimetype
      );

      // Create video document
      const videoDoc = await Video.create({
        pendingCourseId,
        instructorId: req.user.id,
        title: req.body.title || req.file.originalname,
        url,
        duration: Number(req.body.duration) || 0,
        filename: req.file.originalname,
        size: req.file.size,
      });

      return res.status(201).json({
        success: true,
        message: "Video uploaded successfully",
        videoId: videoDoc._id,
        url
      });

    } catch (err) {
      console.error("Video upload error:", err);
      res.status(500).json({
        success: false,
        message: "Video upload failed",
        error: err.message
      });
    }
  }
);

module.exports = router;
