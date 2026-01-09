const express = require('express');
const router = express.Router();
const {
    createReview,
    getCourseReviews,
    getReviewStats,
    getMyReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    reportReview,
    addInstructorResponse
} = require('../controllers/reviewController');

// Auth middleware
const authMiddleware = async (req, res, next) => {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId); // userId, not id - matches authController.js

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found. Please login again.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Optional auth - sets req.user if token exists, otherwise continues
const optionalAuth = (req, res, next) => {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        User.findById(decoded.userId).then(user => { // userId, not id
            req.user = user;
            next();
        });
    } catch (error) {
        next();
    }
};

// Public routes
router.get('/course/:courseId', optionalAuth, getCourseReviews);
router.get('/course/:courseId/stats', getReviewStats);

// Protected routes
router.get('/course/:courseId/my-review', authMiddleware, getMyReview);
router.post('/', authMiddleware, createReview);
router.put('/:reviewId', authMiddleware, updateReview);
router.delete('/:reviewId', authMiddleware, deleteReview);
router.post('/:reviewId/helpful', authMiddleware, toggleHelpful);
router.post('/:reviewId/report', authMiddleware, reportReview);
router.post('/:reviewId/response', authMiddleware, addInstructorResponse);

module.exports = router;
