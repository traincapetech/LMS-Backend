const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const requireAuth = require('../utils/requireAuth');

// All routes require authentication
router.use(requireAuth);

// Enroll in a course
router.post('/enroll', enrollmentController.enroll);

// Get user's enrollments
router.get('/my-enrollments', enrollmentController.getMyEnrollments);

// Check if enrolled in a specific course
router.get('/check/:courseId', enrollmentController.checkEnrollment);

// Unenroll from a course
router.delete('/unenroll/:courseId', enrollmentController.unenroll);

// Get enrollment statistics
router.get('/stats', enrollmentController.getEnrollmentStats);

module.exports = router;

