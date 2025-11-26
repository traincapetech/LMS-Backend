const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const r2 = require("../config/r2");
const Document = require("../models/Document");

const router = express.Router();

// Multer setup for Cloudflare R2
const upload = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET_NAME2, // your lms-documents bucket
      contentType: multerS3.AUTO_CONTENT_TYPE, // ✅ Add this
    key: function (req, file, cb) {
      const uniqueName = `${Date.now()}_${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only document and image files are allowed"));
    }
    cb(null, true);
  },
});
// Get all uploaded documents
router.get("/all/:pendingCourseId", async (req, res) => {
  try {
    const documents = await Document.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});


// Upload document
router.post("/upload/:pendingCourseId", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No file uploaded" });

    const file = req.file;
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL2}/${file.key}`;

    const newDoc = new Document({
      title: file.originalname,
      fileUrl: publicUrl,
      fileName: file.key,
      courseId: req.params.pendingCourseId || null,
    });

    await newDoc.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      document: newDoc,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
