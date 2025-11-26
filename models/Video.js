const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  courseId: {type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  instructorId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  videoUrl: { type: String, default:"" },
  duration: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Video", videoSchema);
