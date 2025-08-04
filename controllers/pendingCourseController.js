const PendingCourse = require('../models/PendingCourse');
const Course = require('../models/Course');

// POST /api/pending-courses/apply
exports.apply = async (req, res) => {
  try {
    const course = new PendingCourse({ ...req.body, status: 'pending' });
    await course.save();
    res.status(201).json({ message: 'Course submitted for review', course });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit course for review', error: err.message });
  }
};

// GET /api/pending-courses/
exports.getAll = async (req, res) => {
  try {
    const courses = await PendingCourse.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending courses', error: err.message });
  }
};

// GET /api/pending-courses/:id
exports.getById = async (req, res) => {
  try {
    const course = await PendingCourse.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch course', error: err.message });
  }
};

// PUT /api/pending-courses/:id/approve
exports.approve = async (req, res) => {
  try {
    const course = await PendingCourse.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', adminMessage: req.body.adminMessage },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Create a published course
    let instructorId = undefined;
    if (course.instructor && course.instructor._id) {
      instructorId = course.instructor._id;
      // Update user role to instructor
      const User = require('../models/User');
      const user = await User.findById(instructorId);
      if (user && user.role !== 'instructor') {
        user.role = 'instructor';
        await user.save();
      }
    }
    const published = new Course({
      title: course.landingTitle,
      subtitle: course.landingSubtitle,
      description: course.landingDesc,
      price: isNaN(Number(course.price)) ? 0 : Number(course.price),
      instructor: instructorId,
      published: true,
      thumbnailUrl: course.thumbnailUrl,
      rating: course.rating || 0,
      badges: course.badges || [],
      learningObjectives: course.learningObjectives || [],
      language: course.language || 'English',
      learners: course.learners || 0,
      ratingsCount: course.ratingsCount || 0,
    });
    await published.save();

    res.json({ message: 'Course approved and published', course: published });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve course', error: err.message });
  }
};

// PUT /api/pending-courses/:id/reject
exports.reject = async (req, res) => {
  try {
    const course = await PendingCourse.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', adminMessage: req.body.adminMessage },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course rejected', course });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject course', error: err.message });
  }
}; 