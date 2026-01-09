const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

/**
 * Middleware to check if user has access to a course discussion
 * User must be either:
 * 1. The course instructor, OR
 * 2. An enrolled student
 */
const checkCourseAccess = async (req, res, next) => {
    try {
        const userId = req.user._id || req.user.id;
        const { courseId } = req.params;

        if (!courseId) {
            return res.status(400).json({ message: 'Course ID is required' });
        }

        // Step 1: Check if user is the instructor
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // If user is the instructor, grant access
        if (course.instructor.toString() === userId.toString()) {
            req.isInstructor = true;
            return next();
        }

        // Step 2: Check if user is enrolled in the course
        const enrollment = await Enrollment.findOne({
            user: userId,
            course: courseId
        });

        if (enrollment) {
            req.isInstructor = false;
            return next();
        }

        // Step 3: Access denied - user is neither instructor nor enrolled
        return res.status(403).json({
            message: 'Access denied. You must be enrolled in this course or be the instructor.'
        });

    } catch (error) {
        console.error('Course access check error:', error);
        res.status(500).json({ message: 'Server error in access check' });
    }
};

module.exports = checkCourseAccess;
