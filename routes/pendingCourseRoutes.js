const express = require("express");
const router = express.Router();
const pendingCourseController = require("../controllers/pendingCourseController");
const requireAuth = require("../utils/requireAuth");
const requireInstructor = require("../utils/requireInstructor");

const multer = require("multer");
const requireAdmin = require("../utils/requireAdmin");
const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 },
}).any();
// POST /api/pending-courses/apply

// GET /api/pending-courses/
router.get("/", pendingCourseController.getAll);

// GET /api/pending-course/my-courses
router.get(
  "/my-courses",
  requireAuth,
  requireInstructor,
  pendingCourseController.getMyCourses
);

//PUT /api/pending-courses/update/:id
router.put(
  "/update/:id",
  requireAuth,
  requireInstructor,
  uploadAny,
  pendingCourseController.editCourse
);

// POST /api/pending-course/create
router.post(
  "/create",
  requireAuth,
  requireInstructor,
  pendingCourseController.createPendingCourse
);

// PUT /api/pending-courses/:id/approve
router.put(
  "/:id/approve",
  requireAuth,
  requireAdmin,
  pendingCourseController.approve
);

// PUT /api/pending-courses/:id/reject
router.put("/:id/reject", pendingCourseController.reject);

//Delete /api/pending-courses/delete/:id
router.delete(
  "/delete/:id",
  requireAuth,
  pendingCourseController.deletePendingCourse
);

// PATCH /api/pending-courses/:id (for quick curriculum updates)
router.patch(
  "/:id",
  requireAuth,
  requireInstructor,
  pendingCourseController.updateCurriculum
);

// GET /api/pending-courses/:id
router.get("/:id", pendingCourseController.getById);

module.exports = router;
