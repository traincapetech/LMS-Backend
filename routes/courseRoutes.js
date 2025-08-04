const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const requireInstructor = require('../utils/requireInstructor');

// Publish a course (instructor only)
router.post('/publish', requireInstructor, courseController.publish);

router.get("/", courseController.getAll);
router.get('/:id', courseController.getById);
router.delete('/:id', courseController.deleteCourse);

module.exports = router; 