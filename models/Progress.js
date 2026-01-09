const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    // Track completed lectures
    completedLectures: [
      {
        lectureId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        itemId: String, // For backward compatibility
        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Track completed quizzes
    completedQuizzes: [
      {
        quizId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Quiz",
          required: true,
        },
        score: Number,
        maxScore: Number,
        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Overall progress percentage
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Last accessed lecture
    lastAccessedLecture: {
      lectureId: mongoose.Schema.Types.ObjectId,
      itemId: String,
      sectionId: String,
      accessedAt: {
        type: Date,
        default: Date.now,
      },
    },
    // Time spent in course (in minutes)
    timeSpent: {
      type: Number,
      default: 0,
    },
    // Course completion status
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Unique course completion certificate ID (if generated)
    certificateId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
progressSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);
