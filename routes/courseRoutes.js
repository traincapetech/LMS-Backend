const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const requireAuth = require('../utils/requireAuth');
const requireInstructor = require('../utils/requireInstructor');

// Publish a course (instructor only)
router.post('/publish', requireAuth, requireInstructor, courseController.publish);

// Dashboard routes
router.post('/dashboard/save', requireAuth, requireInstructor, courseController.saveDashboardData);
router.get('/dashboard/data', requireAuth, requireInstructor, courseController.getDashboardData);
router.put('/dashboard/step/:step', requireAuth, requireInstructor, courseController.updateDashboardStep);

router.get("/", courseController.getAll);
router.get('/:id', courseController.getById);
router.delete('/:id', courseController.deleteCourse);

module.exports = router; 