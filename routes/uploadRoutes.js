const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const r2 = require("../config/r2");

const router = express.Router();

/* ------------------------------------------------
   MULTER-S3 CONFIG FOR CLOUDLFARE R2 IMAGE UPLOAD
--------------------------------------------------- */
const upload = multer({
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET_NAME3, // your image bucket
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const ext = file.originalname.split(".").pop();
      const fileName = `thumbnail_${Date.now()}.${ext}`;
      cb(null, fileName);
    },
  }),

  // 5 MB max for thumbnails
  limits: { fileSize: 5 * 1024 * 1024 },

  // Only images allowed
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, or WebP images allowed"));
    }
    cb(null, true);
  },
});

/* ------------------------------------------------
   UPLOAD THUMBNAIL
--------------------------------------------------- */
router.post("/thumbnail", upload.single("thumbnail"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // req.file.key is the S3 object key
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL3}/${req.file.key}`;

    res.status(200).json({
      success: true,
      message: "Thumbnail uploaded successfully",
      url: publicUrl,
      fileName: req.file.key,
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

module.exports = router;
