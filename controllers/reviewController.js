const Review = require('../models/Review');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Helper: Recalculate course rating
const updateCourseRating = async (courseId) => {
    const mongoose = require('mongoose');
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    const stats = await Review.aggregate([
        { $match: { course: courseObjectId } },
        {
            $group: {
                _id: '$course',
                avgRating: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await Course.findByIdAndUpdate(courseId, {
            rating: Math.round(stats[0].avgRating * 10) / 10, // Round to 1 decimal
            ratingsCount: stats[0].count
        });
    } else {
        await Course.findByIdAndUpdate(courseId, {
            rating: 0,
            ratingsCount: 0
        });
    }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (enrolled students only)
exports.createReview = async (req, res) => {
    try {
        const { courseId, rating, title, content } = req.body;
        const userId = req.user._id;

        // Check if user is enrolled
        const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
        if (!enrollment) {
            return res.status(403).json({
                success: false,
                message: 'You must be enrolled in this course to leave a review'
            });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({ user: userId, course: courseId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this course. Please edit your existing review.'
            });
        }

        const review = await Review.create({
            user: userId,
            course: courseId,
            rating,
            title,
            content
        });

        // Populate user info
        await review.populate('user', 'name photoUrl');

        // Update course rating
        await updateCourseRating(courseId);

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create review',
            error: error.message
        });
    }
};

// @desc    Get all reviews for a course
// @route   GET /api/reviews/course/:courseId
// @access  Public
exports.getCourseReviews = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { rating, sort = 'recent', page = 1, limit = 10, search } = req.query;

        const query = { course: courseId, reported: false };

        // Filter by rating
        if (rating && rating !== 'all') {
            query.rating = parseInt(rating);
        }

        // Search in content
        if (search) {
            query.content = { $regex: search, $options: 'i' };
        }

        // Sort options
        let sortOption = { createdAt: -1 }; // default: recent
        if (sort === 'helpful') {
            sortOption = { 'helpful': -1, createdAt: -1 };
        } else if (sort === 'highest') {
            sortOption = { rating: -1, createdAt: -1 };
        } else if (sort === 'lowest') {
            sortOption = { rating: 1, createdAt: -1 };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Review.find(query)
            .populate('user', 'name photoUrl')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments(query);

        res.json({
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get reviews',
            error: error.message
        });
    }
};

// @desc    Get review stats (rating distribution)
// @route   GET /api/reviews/course/:courseId/stats
// @access  Public
exports.getReviewStats = async (req, res) => {
    try {
        const { courseId } = req.params;
        const mongoose = require('mongoose');

        const stats = await Review.aggregate([
            { $match: { course: new mongoose.Types.ObjectId(courseId), reported: false } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        const totalReviews = await Review.countDocuments({ course: courseId, reported: false });
        const course = await Course.findById(courseId).select('rating ratingsCount');

        // Build distribution object
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        stats.forEach(s => {
            distribution[s._id] = s.count;
        });

        // Calculate percentages
        const percentages = {};
        Object.keys(distribution).forEach(key => {
            percentages[key] = totalReviews > 0
                ? Math.round((distribution[key] / totalReviews) * 100)
                : 0;
        });

        res.json({
            success: true,
            data: {
                averageRating: course?.rating || 0,
                totalReviews,
                distribution,
                percentages
            }
        });
    } catch (error) {
        console.error('Get review stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get review stats',
            error: error.message
        });
    }
};

// @desc    Get current user's review for a course
// @route   GET /api/reviews/course/:courseId/my-review
// @access  Private
exports.getMyReview = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;

        const review = await Review.findOne({ user: userId, course: courseId })
            .populate('user', 'name photoUrl');

        res.json({
            success: true,
            data: review // null if not found
        });
    } catch (error) {
        console.error('Get my review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get your review',
            error: error.message
        });
    }
};

// @desc    Update own review
// @route   PUT /api/reviews/:reviewId
// @access  Private
exports.updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, title, content } = req.body;
        const userId = req.user._id;

        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check ownership
        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own reviews'
            });
        }

        review.rating = rating || review.rating;
        review.title = title !== undefined ? title : review.title;
        review.content = content || review.content;

        await review.save();
        await review.populate('user', 'name photoUrl');

        // Update course rating
        await updateCourseRating(review.course);

        res.json({
            success: true,
            message: 'Review updated successfully',
            data: review
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update review',
            error: error.message
        });
    }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:reviewId
// @access  Private (owner or admin)
exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check ownership or admin
        if (review.user.toString() !== userId.toString() && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this review'
            });
        }

        const courseId = review.course;
        await Review.findByIdAndDelete(reviewId);

        // Update course rating
        await updateCourseRating(courseId);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete review',
            error: error.message
        });
    }
};

// @desc    Toggle helpful vote
// @route   POST /api/reviews/:reviewId/helpful
// @access  Private
exports.toggleHelpful = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        const review = await Review.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if already voted
        const helpfulIndex = review.helpful.indexOf(userId);

        if (helpfulIndex > -1) {
            // Remove vote
            review.helpful.splice(helpfulIndex, 1);
        } else {
            // Add vote
            review.helpful.push(userId);
        }

        await review.save();

        res.json({
            success: true,
            message: helpfulIndex > -1 ? 'Vote removed' : 'Marked as helpful',
            helpfulCount: review.helpful.length,
            isHelpful: helpfulIndex === -1
        });
    } catch (error) {
        console.error('Toggle helpful error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update helpful vote',
            error: error.message
        });
    }
};

// @desc    Report a review
// @route   POST /api/reviews/:reviewId/report
// @access  Private
exports.reportReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;

        const review = await Review.findByIdAndUpdate(
            reviewId,
            { reported: true, reportReason: reason },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        res.json({
            success: true,
            message: 'Review reported successfully'
        });
    } catch (error) {
        console.error('Report review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report review',
            error: error.message
        });
    }
};

// @desc    Add instructor response
// @route   POST /api/reviews/:reviewId/response
// @access  Private (course instructor only)
exports.addInstructorResponse = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { response } = req.body;
        const userId = req.user._id;

        const review = await Review.findById(reviewId).populate('course');

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if user is the course instructor
        if (review.course.instructor.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the course instructor can respond to reviews'
            });
        }

        review.instructorResponse = {
            content: response,
            respondedAt: new Date()
        };

        await review.save();
        await review.populate('user', 'name photoUrl');

        res.json({
            success: true,
            message: 'Response added successfully',
            data: review
        });
    } catch (error) {
        console.error('Add instructor response error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add response',
            error: error.message
        });
    }
};
