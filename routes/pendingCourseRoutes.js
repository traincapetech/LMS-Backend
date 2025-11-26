const express = require('express');
const router = express.Router();
const pendingCourseController = require('../controllers/pendingCourseController');
const requireAuth = require('../utils/requireAuth');
const requireInstructor = require('../utils/requireInstructor');

// POST /api/pending-courses/apply
router.post('/apply', pendingCourseController.apply);

// GET /api/pending-courses/
router.get('/', pendingCourseController.getAll);

// GET /api/pending-course/my-courses
router.get('/my-courses', requireAuth, requireInstructor, pendingCourseController.getMyCourses);

// GET /api/pending-courses/:id
router.get('/:id', pendingCourseController.getById);

// POST /api/pending-course/create
router.post("/create", requireAuth, requireInstructor, pendingCourseController.createPendingCourse);

//PUT /api/pending-courses/update/:id
router.put("/update/:id",requireAuth, requireInstructor, pendingCourseController.editCourse)

// PUT /api/pending-courses/:id/approve
router.put('/:id/approve', pendingCourseController.approve);

// PUT /api/pending-courses/:id/reject
router.put('/:id/reject', pendingCourseController.reject);



module.exports = router; 