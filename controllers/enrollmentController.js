const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const User = require('../models/User');
const CourseDiscussion = require('../models/CourseDiscussion');
const PendingCourse = require('../models/PendingCourse');

const sendWelcomeIfAvailable = async (courseId, userId, instructorId) => {
  const { sendWelcomeMessage } = require('./discussionController');
  if (!instructorId) return;
  sendWelcomeMessage(courseId, userId, instructorId)
    .then(() => console.log(`✅ Welcome message sent for enrollment`))
    .catch(err => console.error('⚠️ Welcome message failed:', err));
};

const createEnrollmentForUser = async ({
  userId,
  courseId,
  paymentMethod = 'free',
  amountPaid = 0,
  paymentId = null,
  orderId = null
}) => {
  const course = await Course.findById(courseId).populate('instructor');
  if (!course || !course.published) {
    throw new Error('Course not found or not published');
  }

  const existingEnrollment = await Enrollment.findOne({
    user: userId,
    course: courseId
  });

  if (existingEnrollment) {
    return { enrollment: existingEnrollment, created: false, course };
  }

  const enrollment = new Enrollment({
    user: userId,
    course: courseId,
    enrolledAt: new Date(),
    lastAccessedAt: new Date(),
    paymentMethod,
    amountPaid,
    paymentId,
    orderId
  });

  await enrollment.save();

  const progress = new Progress({
    enrollment: enrollment._id,
    user: userId,
    course: courseId
  });
  await progress.save();

  await Course.findByIdAndUpdate(courseId, {
    $inc: { learners: 1 }
  });

  await sendWelcomeIfAvailable(courseId, userId, course.instructor?._id);

  return { enrollment, created: true, course };
};

// Enroll a student in a course
exports.enroll = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    // Check if course exists
    const course = await Course.findById(courseId).populate('instructor');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.published) {
      return res.status(400).json({ message: 'Course is not published' });
    }

    if (Number(course.price || 0) > 0) {
      return res.status(402).json({
        message: 'Payment required to enroll in this course',
        requiresPayment: true
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        message: 'Already enrolled in this course',
        enrollment: existingEnrollment
      });
    }

    const { enrollment } = await createEnrollmentForUser({
      userId,
      courseId,
      paymentMethod: 'free',
      amountPaid: 0
    });

    // Populate course details for response
    await enrollment.populate('course');

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createEnrollmentForUser = createEnrollmentForUser;

// Get all enrollments for a user
exports.getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const enrollments = await Enrollment.find({ user: userId })
      .populate('course')
      .populate({
        path: 'course',
        populate: {
          path: 'instructor',
          select: 'name email photoUrl'
        }
      })
      .sort({ enrolledAt: -1 });

    // Get progress for each enrollment
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progress = await Progress.findOne({
          user: userId,
          course: enrollment.course._id
        });

        return {
          ...enrollment.toObject(),
          progress: progress ? {
            progressPercentage: progress.progressPercentage,
            completedLectures: progress.completedLectures?.length || 0,
            isCompleted: progress.isCompleted,
            lastAccessedLecture: progress.lastAccessedLecture
          } : {
            progressPercentage: 0,
            completedLectures: 0,
            isCompleted: false,
            lastAccessedLecture: null
          }
        };
      })
    );

    res.json({
      enrollments: enrollmentsWithProgress,
      count: enrollmentsWithProgress.length
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check if user is enrolled in a course
exports.checkEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id || req.user.id;

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!enrollment) {
      return res.json({ isEnrolled: false });
    }

    // Get progress
    const progress = await Progress.findOne({
      user: userId,
      course: courseId
    });

    res.json({
      isEnrolled: true,
      enrollment,
      progress: progress ? {
        progressPercentage: progress.progressPercentage,
        completedLectures: progress.completedLectures?.length || 0,
        isCompleted: progress.isCompleted,
        lastAccessedLecture: progress.lastAccessedLecture
      } : null
    });
  } catch (error) {
    console.error('Check enrollment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Unenroll from a course (optional feature)
exports.unenroll = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id || req.user.id;

    const enrollment = await Enrollment.findOneAndDelete({
      user: userId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Delete progress
    await Progress.findOneAndDelete({
      user: userId,
      course: courseId
    });

    // Update course learners count
    await Course.findByIdAndUpdate(courseId, {
      $inc: { learners: -1 }
    });

    res.json({ message: 'Successfully unenrolled from course' });
  } catch (error) {
    console.error('Unenroll error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get enrollment statistics for a user
exports.getEnrollmentStats = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const totalEnrollments = await Enrollment.countDocuments({ user: userId });
    const completedCourses = await Enrollment.countDocuments({
      user: userId,
      isCompleted: true
    });
    const inProgressCourses = totalEnrollments - completedCourses;

    // Get average progress
    const progressDocs = await Progress.find({ user: userId });
    const avgProgress = progressDocs.length > 0
      ? progressDocs.reduce((sum, p) => sum + (p.progressPercentage || 0), 0) / progressDocs.length
      : 0;

    res.json({
      totalEnrollments,
      completedCourses,
      inProgressCourses,
      averageProgress: Math.round(avgProgress)
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

