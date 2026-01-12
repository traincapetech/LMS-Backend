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

      // Check if R2 environment variables are set and not empty
      const imagesBucketName = process.env.R2_BUCKET_IMAGES?.trim();
      const imagesPublicUrl = process.env.R2_PUBLIC_URL_IMAGES?.trim();
      
      if (!imagesBucketName || !imagesPublicUrl) {
        console.error("R2 configuration missing or empty:", {
          R2_BUCKET_IMAGES: imagesBucketName || "MISSING",
          R2_PUBLIC_URL_IMAGES: imagesPublicUrl || "MISSING",
        });
        return res.status(500).json({
          success: false,
          message: "Image storage not configured. Please contact administrator.",
          error: "R2_BUCKET_IMAGES or R2_PUBLIC_URL_IMAGES environment variable is missing or empty",
        });
      }

      // 🗂 R2 key organized by user + course
      const key = `thumbnails/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname}`;

      // 📤 Upload to R2
      let url;
      try {
        url = await uploadToBucket(
          req.file.buffer,
          imagesBucketName, // Use validated bucket name
          key,
          req.file.mimetype
        );
      } catch (uploadErr) {
        console.error("R2 upload error:", uploadErr);
        console.error("Upload error details:", {
          bucket: imagesBucketName,
          key: key,
          fileSize: req.file.size,
          error: uploadErr.message,
        });
        return res.status(500).json({
          success: false,
          message: "Failed to upload thumbnail to storage",
          error: uploadErr.message,
        });
      }

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

      // Check if R2 environment variables are set and not empty
      const docsBucketName = process.env.R2_BUCKET_DOCS?.trim();
      const docsPublicUrl = process.env.R2_PUBLIC_URL_DOCS?.trim();
      
      if (!docsBucketName || !docsPublicUrl) {
        console.error("R2 configuration missing or empty:", {
          R2_BUCKET_DOCS: docsBucketName || "MISSING",
          R2_PUBLIC_URL_DOCS: docsPublicUrl || "MISSING",
        });
        return res.status(500).json({
          success: false,
          message: "Document storage not configured. Please contact administrator.",
          error: "R2_BUCKET_DOCS or R2_PUBLIC_URL_DOCS environment variable is missing or empty",
        });
      }

      // Upload to bucket
      const key = `documents/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname}`;

      let url;
      try {
        url = await uploadToBucket(
          req.file.buffer,
          docsBucketName, // Use validated bucket name
          key,
          req.file.mimetype
        );
      } catch (uploadErr) {
        console.error("R2 upload error:", uploadErr);
        console.error("Upload error details:", {
          bucket: docsBucketName,
          key: key,
          fileSize: req.file.size,
          error: uploadErr.message,
        });
        return res.status(500).json({
          success: false,
          message: "Failed to upload document to storage",
          error: uploadErr.message,
        });
      }

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

      // Check if R2 environment variables are set and not empty
      const bucketName = process.env.R2_BUCKET_VIDEOS?.trim();
      const publicUrl = process.env.R2_PUBLIC_URL_VIDEOS?.trim();
      
      console.log("🔍 Checking R2 configuration for video upload:", {
        R2_BUCKET_VIDEOS: bucketName ? `"${bucketName}" (${bucketName.length} chars)` : "MISSING",
        R2_PUBLIC_URL_VIDEOS: publicUrl ? `"${publicUrl}" (${publicUrl.length} chars)` : "MISSING",
        R2_BUCKET_VIDEOS_raw: process.env.R2_BUCKET_VIDEOS,
      });
      
      if (!bucketName || bucketName === '' || !publicUrl || publicUrl === '') {
        console.error("❌ R2 configuration missing or empty:", {
          R2_BUCKET_VIDEOS: bucketName || "MISSING",
          R2_PUBLIC_URL_VIDEOS: publicUrl || "MISSING",
          raw_R2_BUCKET_VIDEOS: process.env.R2_BUCKET_VIDEOS,
        });
        return res.status(500).json({
          success: false,
          message: "Video storage not configured. Please contact administrator.",
          error: "R2_BUCKET_VIDEOS or R2_PUBLIC_URL_VIDEOS environment variable is missing or empty",
        });
      }
      
      // Double-check bucket name is valid before proceeding
      if (typeof bucketName !== 'string' || bucketName.length === 0) {
        console.error("❌ Invalid bucket name type or length:", {
          bucketName: bucketName,
          type: typeof bucketName,
          length: bucketName?.length,
        });
        return res.status(500).json({
          success: false,
          message: "Video storage configuration error",
          error: "Bucket name is invalid",
        });
      }

      const key = `videos/${req.user.id}/${pendingCourseId}/${Date.now()}_${req.file.originalname}`;

      // Final validation before upload
      console.log("🚀 About to upload video:", {
        bucketName: bucketName,
        bucketNameType: typeof bucketName,
        bucketNameLength: bucketName?.length,
        key: key,
        fileSize: req.file.size,
        mimetype: req.file.mimetype,
      });

      // Ensure bucketName is still valid (defensive check)
      if (!bucketName || typeof bucketName !== 'string' || bucketName.trim() === '') {
        console.error("❌ Bucket name became invalid before upload:", bucketName);
        return res.status(500).json({
          success: false,
          message: "Video storage configuration error",
          error: "Bucket name validation failed",
        });
      }

      let url;
      try {
        url = await uploadToBucket(
          req.file.buffer,
          bucketName, // Use validated bucket name
          key,
          req.file.mimetype
        );
      } catch (uploadErr) {
        console.error("R2 upload error:", uploadErr);
        console.error("Upload error details:", {
          bucket: bucketName,
          key: key,
          fileSize: req.file.size,
          error: uploadErr.message,
        });
        return res.status(500).json({
          success: false,
          message: "Failed to upload video to storage",
          error: uploadErr.message,
        });
      }

      // Create video document
      let videoDoc;
      try {
        videoDoc = await Video.create({
          pendingCourseId,
          instructorId: req.user.id,
          title: req.body.title || req.file.originalname,
          url,
          duration: Number(req.body.duration) || 0,
          filename: req.file.originalname,
          size: req.file.size,
        });
      } catch (dbErr) {
        console.error("Database error:", dbErr);
        return res.status(500).json({
          success: false,
          message: "Failed to save video record",
          error: dbErr.message,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Video uploaded successfully",
        videoId: videoDoc._id,
        url,
      });
    } catch (err) {
      console.error("Video upload error:", err);
      console.error("Error stack:", err.stack);
      res.status(500).json({
        success: false,
        message: "Video upload failed",
        error: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  }
);

module.exports = router;
