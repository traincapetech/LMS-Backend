const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  fileUrl: String,
  fileName: String
}, { _id: false });

const ItemSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  type: String,
  title: String,
  videoUrl: String,
  documents: [],
  quizId: { type: mongoose.Schema.Types.ObjectId, default: null }
});

const SectionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  title: String, // 👈 renamed from sectionTitle
  items: [ItemSchema]
});

const pendingCourseSchema = new mongoose.Schema({
  learningObjectives: [String],
  requirements: [String],
  courseFor: String,
  structure: String,

  testVideo: { type: String, default: "" },
  thumbnailUrl: String,
  filmEdit: { type: String, default: "" },
  sampleVideo: { type: String, default: "" },
  captions: { type: String, default: "" },
  accessibility: { type: String, default: "" },

  landingTitle: String,
  landingSubtitle: String,
  landingDesc: String,
  price: String,
  promoCode: String,
  promoDesc: String,
  welcomeMsg: String,
  congratsMsg: String,

  curriculum: [SectionSchema],

  instructor: { type: mongoose.Schema.Types.Mixed, required: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  isNew: {                         // this add to check the course it new or going to edit
    type: Boolean, 
    default: true 
  },

  adminMessage: String
}, { timestamps: true });

module.exports = mongoose.model('PendingCourse', pendingCourseSchema);
