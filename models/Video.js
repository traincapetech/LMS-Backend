// models/Video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  pendingCourseId: { type: mongoose.Schema.Types.ObjectId, ref: 'PendingCourse', required: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },           // public R2 URL
  duration: { type: Number, default: 0 },
  filename: String,
  size: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);
