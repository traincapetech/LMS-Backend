const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  timeLimit: { type: Number },
  totalScore: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// 🔹 Create virtual field to link questions to each quiz
quizSchema.virtual('questions', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'quiz',
});

quizSchema.set('toObject', { virtuals: true });
quizSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Quiz', quizSchema);
