const Course = require('../models/Course');
const PendingCourse = require('../models/PendingCourse');

exports.publish = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    if (!title || !description || !price) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const course = new Course({
      title,
      description,
      price,
      instructor: req.user._id,
      published: true,
    });
    await course.save();
    res.status(201).json({ message: 'Course published successfully.', course });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const courses = await Course.find({ published: true }).populate("instructor");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch courses", error: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete course", error: err.message });
  }
};

// Get course by ID
exports.getById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor');
    if (!course || !course.published) return res.status(404).json({ message: 'Course not found or not published' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch course', error: err.message });
  }
};




// Save dashboard data used in teach page
exports.saveDashboardData = async (req, res) => {
  try {
    const { step, data } = req.body;
    const instructorId = req.user._id;

    // Check if there's already a pending course for this instructor
    let pendingCourse = await PendingCourse.findOne({
      instructor: instructorId,
      status: { $in: ['pending', 'approved'] }
    });

    if (!pendingCourse) {
      // Create new pending course
      pendingCourse = new PendingCourse({
        instructor: {
          _id: instructorId,
          name: req.user.name,
          email: req.user.email
        },
        status: 'pending'
      });
    }

    // Update the specific step data
    pendingCourse[step] = data;
    await pendingCourse.save();

    res.json({
      message: 'Dashboard data saved successfully',
      pendingCourseId: pendingCourse._id,
      step
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save dashboard data', error: err.message });
  }
};

// Get dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    const instructorId = req.user._id;

    const pendingCourse = await PendingCourse.findOne({
      instructor: instructorId,
      status: { $in: ['pending', 'approved'] }
    });

    if (!pendingCourse) {
      return res.json({ data: null });
    }

    res.json({ data: pendingCourse });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: err.message });
  }
};

// Update specific dashboard step
exports.updateDashboardStep = async (req, res) => {
  try {
    const { step } = req.params;
    const { data } = req.body;
    const instructorId = req.user._id;

    let pendingCourse = await PendingCourse.findOne({
      instructor: instructorId,
      status: { $in: ['pending', 'approved'] }
    });

    if (!pendingCourse) {
      // Create new pending course
      pendingCourse = new PendingCourse({
        instructor: {
          _id: instructorId,
          name: req.user.name,
          email: req.user.email
        },
        status: 'pending'
      });
    }

    // Update the specific step data
    pendingCourse[step] = data;
    await pendingCourse.save();

    res.json({
      message: 'Step data updated successfully',
      pendingCourseId: pendingCourse._id,
      step
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update step data', error: err.message });
  }
}; 