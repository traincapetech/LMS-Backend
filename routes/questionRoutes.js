const express = require('express');
const router = express.Router();
const requireAuth = require('../utils/requireAuth');
const {
    getQuestions,
    getFeaturedQuestions,
    getQuestion,
    createQuestion,
    addReply,
    upvoteQuestion,
    upvoteReply,
    followQuestion
} = require('../controllers/questionController');

// Public routes (optional auth for filters)
router.get('/course/:courseId', getQuestions);
router.get('/course/:courseId/featured', getFeaturedQuestions);
router.get('/:id', getQuestion);

// Protected routes (require login)
router.post('/', requireAuth, createQuestion);
router.post('/:id/reply', requireAuth, addReply);
router.post('/:id/upvote', requireAuth, upvoteQuestion);
router.post('/:id/reply/:replyId/upvote', requireAuth, upvoteReply);
router.post('/:id/follow', requireAuth, followQuestion);

module.exports = router;
