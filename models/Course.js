const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  published: { type: Boolean, default: false },
  thumbnailUrl: { type: String },
  rating: { type: Number, default: 0 },
  badges: [{ type: String }],
  subtitle: { type: String },
  learningObjectives: [String],
  language: { type: String, default: 'English' },
  learners: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema); 