const express = require("express");
const router = express.Router();
const multer = require("multer");
const requireAuth = require("../utils/requireAuth");
const publicController = require("../controllers/publicController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/stats", publicController.getHomeStats);
router.post("/contact", publicController.submitContactForm);
router.post(
  "/upload-avatar",
  requireAuth,
  upload.single("avatar"),
  publicController.uploadAvatar
);
router.post("/remove-avatar", requireAuth, publicController.removeAvatar);

module.exports = router;
