const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const requireAuth = require('../utils/requireAuth');

// All routes require authentication
router.use(requireAuth);

// Mark lecture as completed
router.post('/lecture/complete', progressController.markLectureComplete);

// Update last accessed lecture
router.post('/lecture/access', progressController.updateLastAccessed);

// Get progress for a course
router.get('/course/:courseId', progressController.getCourseProgress);

// Mark quiz as completed
router.post('/quiz/complete', progressController.markQuizComplete);

// Generate certificate
router.get('/certificate/:courseId', progressController.generateCertificate);

module.exports = router;

