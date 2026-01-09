const express = require('express');
const router = express.Router();
const requireAuth = require('../utils/requireAuth');
const checkCourseAccess = require('../utils/checkCourseAccess');
const {
    sendMessage,
    getCourseMessages,
    getUnreadCount,
    getInstructorConversations,    // NEW
    getStudentConversation          // NEW
} = require('../controllers/discussionController');

/**
 * Discussion Routes
 * Base: /api/discussion
 * 
 * All routes require:
 * 1. Authentication (requireAuth)
 * 2. Course access (checkCourseAccess) - user must be instructor OR enrolled
 */

// Get unread message count (doesn't need course access check)
// GET /api/discussion/unread-count
router.get('/unread-count', requireAuth, getUnreadCount);

// NEW: Get instructor's student conversations
// GET /api/discussion/instructor/conversations
router.get('/instructor/conversations', requireAuth, getInstructorConversations);

// NEW: Get specific student conversation (instructor view)
// GET /api/discussion/instructor/:courseId/:studentId
router.get('/instructor/:courseId/:studentId', requireAuth, getStudentConversation);

// Get all messages for a course
// GET /api/discussion/:courseId
router.get('/:courseId', requireAuth, checkCourseAccess, getCourseMessages);

// Send a new message
// POST /api/discussion/:courseId
router.post('/:courseId', requireAuth, checkCourseAccess, sendMessage);

module.exports = router;
