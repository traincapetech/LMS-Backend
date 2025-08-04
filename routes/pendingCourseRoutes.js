const express = require('express');
const router = express.Router();
const pendingCourseController = require('../controllers/pendingCourseController');

// POST /api/pending-courses/apply
router.post('/apply', pendingCourseController.apply);

// GET /api/pending-courses/
router.get('/', pendingCourseController.getAll);

// GET /api/pending-courses/:id
router.get('/:id', pendingCourseController.getById);

// PUT /api/pending-courses/:id/approve
router.put('/:id/approve', pendingCourseController.approve);

// PUT /api/pending-courses/:id/reject
router.put('/:id/reject', pendingCourseController.reject);

module.exports = router; 