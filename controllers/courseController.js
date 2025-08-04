const Course = require('../models/Course');

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