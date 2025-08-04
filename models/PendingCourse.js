const mongoose = require('mongoose');

const pendingCourseSchema = new mongoose.Schema({
  learningObjectives: [String],
  requirements: [String],
  courseFor: String,
  structure: String,
  testVideo: String,
  filmEdit: String,
  curriculum: String,
  captions: String,
  accessibility: String,
  landingTitle: String,
  landingSubtitle: String,
  landingDesc: String,
  price: String,
  promoCode: String,
  promoDesc: String,
  welcomeMsg: String,
  congratsMsg: String,
  thumbnailUrl: String,
  badges: [{ type: String }],
  language: { type: String, default: 'English' },
  learners: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  instructor: {
    type: mongoose.Schema.Types.Mixed, // Store instructor info as object
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminMessage: String
}, { timestamps: true });

module.exports = mongoose.model('PendingCourse', pendingCourseSchema); 