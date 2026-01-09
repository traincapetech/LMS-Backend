const InstructorRequest = require("../models/InstructorRequest");
const User = require("../models/User");
const Instructor = require("../models/Instructor");

// Only allow admin (hardcoded email) to approve/reject


function isAdmin(req) {
  return (
    req.user && (req.user.role === "admin")
  );
}

exports.apply = async (req, res) => {
  const { name, email, bio } = req.body;
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  // Prevent duplicate requests
  const existing = await InstructorRequest.findOne({
    user: userId,
    status: "pending",
  });
  if (existing)
    return res
      .status(400)
      .json({ message: "You already have a pending request." });
  const request = new InstructorRequest({ user: userId, name, email, bio });
  await request.save();
  res.status(201).json({ message: "Request submitted." });
};

exports.list = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
  const requests = await InstructorRequest.find().populate(
    "user",
    "name email"
  );
  res.json(requests);
};

exports.approve = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
  const request = await InstructorRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });
  request.status = "approved";
  await request.save();
  // Promote user to instructor
  const user = await User.findByIdAndUpdate(
    request.user,
    { role: "instructor" },
    { new: true }
  );
  // Create/update Instructor entry
  await Instructor.findOneAndUpdate(
    { email: user.email },
    {
      fullName: user.name,
      email: user.email,
      isSubscribed: false,
      isVerified: true,
    },
    { upsert: true, new: true }
  );
  // Add notification
  user.notifications.unshift({
    message:
      "Your instructor request was approved! You can now access the instructor dashboard.",
    type: "instructor-request",
    read: false,
    createdAt: new Date(),
  });
  await user.save();
  res.json({ message: "Instructor approved." });
};

// for deleting the instructors

exports.deleteInstructor = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    res.json({
      success: true,
      deleted,
      message: "Instructor deleted successfully",
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete user", error: err.message });
  }
};

exports.reject = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
  const request = await InstructorRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });
  request.status = "rejected";
  await request.save();
  // Add notification
  const user = await User.findById(request.user);
  if (user) {
    user.notifications.unshift({
      message: "Your instructor request was rejected by the admin.",
      type: "instructor-request",
      read: false,
      createdAt: new Date(),
    });
    await user.save();
  }
  res.json({ message: "Instructor request rejected." });
};
