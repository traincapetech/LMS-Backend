// routes/upload.js
const express = require("express");
const multer = require("multer");
const router = express.Router();

const requireAuth = require("../utils/requireAuth");
const requireInstructor = require("../utils/requireInstructor");
const PendingCourse = require("../models/PendingCourse");
const Video = require("../models/Video");

const { uploadToBucket } = require("../config/r2.js");

// Multer memory storage (required for R2)
const upload = multer({ storage: multer.memoryStorage() });

router.get("/check/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID before querying to prevent spam errors
    if (!id || id === 'undefined' || id === 'null' || id.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID provided"
      });
    }

    /* --------------------------------------------
       CASE 1: The id is a PendingCourseId
    --------------------------------------------- */
    let course = await PendingCourse.findById(id);

    if (course) {
      const videos = await Video.find({ pendingCourseId: id });

      return res.json({
        success: true,
        type: "course",
        courseCurriculum: course.curriculum || [],
        uploadedVideos: videos || [],
      });
    }
    let video = await Video.findById(id);

    if (video) {
      return res.json({
        success: true,
        type: "video",
        video,
      });
    }

    /* --------------------------------------------
       CASE 3: Invalid ID entirely
    --------------------------------------------- */
    return res.status(404).json({
      success: false,
      message: "No course or video found with this ID",
    });
  } catch (err) {
    console.error("Check error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to check files",
      error: err.message,
    });
  }
});

/* ---------------------------------------------------------
   📌 1. UPLOAD THUMBNAIL (Images Bucket)
---------------------------------------------------------- */
//api/upload/thumbnail/:pendingCourseId
router.post(
  "/thumbnail/:pendingCourseId",
  requireAuth,
  requireInstructor,
  upload.single("thumbnail"),
  async (req, res) => {
    try {
      const { pendingCourseId } = req.params;

      if (!req.file)
        return res.status(400).json({ message: "No thumbnail uploaded" });

      // 🧠 Verify user owns the course
      const course = await PendingCourse.findOne({
        _id: pendingCourseId,
        $or: [{ instructor: req.user.id }, { "instructor._id": req.user.id }],
      });

      if (!course)
        return res.status(404).json({
          success: false,
          message: "Pending course not found or unauthorized",
        });

      // 🗂 R2 key organized by user + course
      const key = `thumbnails/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname
        }`;

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
  }
);

/* ---------------------------------------------------------
   📄 2. UPLOAD DOCUMENTS (Docs Bucket)
---------------------------------------------------------- */
// api/upload/document/:pendingcourseId/:sectionId/:itemId
router.post(
  "/document/:pendingCourseId",
  requireAuth,
  requireInstructor,
  upload.single("file"),
  async (req, res) => {
    try {
      const { pendingCourseId } = req.params;

      if (!req.file)
        return res.status(400).json({ message: "No document uploaded" });

      // Verify course
      const course = await PendingCourse.findOne({
        _id: pendingCourseId,
        $or: [{ instructor: req.user.id }, { "instructor._id": req.user.id }],
      });

      if (!course)
        return res.status(404).json({
          success: false,
          message: "Pending course not found or unauthorized",
        });

      // Upload to bucket
      const key = `documents/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname
        }`;

      const url = await uploadToBucket(
        req.file.buffer,
        process.env.R2_BUCKET_DOCS,
        key,
        req.file.mimetype
      );

      // // 🔎 Find section by ID
      // console.log("📋 Looking for section:", sectionId);
      // console.log(
      //   "📋 Available sections:",
      //   course.curriculum.map((s) => ({
      //     _id: String(s._id),
      //     id: s.id,
      //     title: s.title,
      //   }))
      // );

      // const section = course.curriculum.find(
      //   (sec) =>
      //     String(sec._id) === String(sectionId) ||
      //     String(sec.id) === String(sectionId)
      // );

      // if (!section) {
      //   console.error("❌ Section not found. Looking for:", sectionId);
      //   console.error(
      //     "Available section IDs:",
      //     course.curriculum.map((s) => String(s._id))
      //   );
      //   throw new Error("Section not found");
      // }

      // console.log("✅ Found section:", section.title);

      // // 🔎 Find item by ID
      // console.log("📋 Looking for item:", itemId);
      // console.log(
      //   "📋 Available items:",
      //   section.items.map((i) => ({
      //     _id: String(i._id),
      //     id: i.id,
      //     title: i.title,
      //   }))
      // );

      // const item = section.items.find(
      //   (it) =>
      //     String(it._id) === String(itemId) || String(it.id) === String(itemId)
      // );

      // if (!item) {
      //   console.error("❌ Item not found. Looking for:", itemId);
      //   console.error(
      //     "Available item IDs:",
      //     section.items.map((i) => String(i._id))
      //   );
      //   throw new Error("Item not found");
      // }

      // console.log("✅ Found item:", item.title);

      // // Ensure documents array exists
      // if (!item.documents) item.documents = [];

      // // Save document
      // item.documents.push({
      //   fileUrl: url,
      //   fileName: req.file.originalname,
      // });

      // await course.save();

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
router.post(
  "/videos/:pendingCourseId",
  requireAuth,
  requireInstructor,
  upload.single("video"),
  async (req, res) => {
    try {
      const pendingCourseId = req.params.pendingCourseId;

      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      // Verify user owns the course
      const course = await PendingCourse.findOne({
        _id: pendingCourseId,
        $or: [{ instructor: req.user.id }, { "instructor._id": req.user.id }],
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Pending course not found or unauthorized",
        });
      }

      const key = `videos/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname
        }`;

      const url = await uploadToBucket(
        req.file.buffer,
        process.env.R2_BUCKET_VIDEOS, // ⭐ Correct bucket
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
        url,
      });
    } catch (err) {
      console.error("Video upload error:", err);
      res.status(500).json({
        success: false,
        message: "Video upload failed",
        error: err.message,
      });
    }
  }
);

module.exports = router;
