const express = require("express");
const router = express.Router();
const requireAuth = require("../utils/requireAuth");
const requireAdmin = require("../utils/requireAdmin");
const adminCourseController = require("../controllers/adminCourseController");

router.use(requireAuth);
router.use(requireAdmin);

router.delete("/pending/:pendingId", adminCourseController.deletePendingCourse);
router.delete("/all", adminCourseController.deleteAllCourses);

module.exports = router;
