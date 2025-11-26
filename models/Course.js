const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  price: { type: Number, default: 0 },

  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  courseType: { type: String },
  category: { type: String },
  timeCommitment: { type: String },

  curriculum: [
  {
    sectionTitle: String,
    items: [
      {
        type: String,
        title: String,
        videoUrl: String,
        documents: [
          { fileUrl: String, fileName: String }
        ],
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }
      }
    ]
  }
],
  published: { type: Boolean, default: false },
  thumbnailUrl: { type: String },
  rating: { type: Number, default: 0 },
  badges: [{ type: String }],
  subtitle: { type: String },
  learningObjectives: [String],
  language: { type: String, default: "English" },
  learners: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema); 
