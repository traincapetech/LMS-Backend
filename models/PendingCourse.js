// models/PendingCourse.js
const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    fileUrl: String,
    fileName: String,
  },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    type: { type: String, required: true }, // "lecture" | "quiz" | "document"
    title: String,
    // now we store reference to video document (Option A)
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      default: null,
    },
    documents: [DocumentSchema],

    // Embedded questions for quizzes
    // Embedded questions for quizzes
    // Using Mixed Array ([]) to bypass "Cast to [string]" error
    quizQuestions: [],

    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
  },
  { _id: false }
);

const SectionSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    title: String,
    items: [ItemSchema],
  },
  { _id: false }
);

const pendingCourseSchema = new mongoose.Schema(
  {
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
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isBrandNew: { type: Boolean, default: true },
    courseType: {
      type: String,
      enum: ["course", "practice"],
      default: "course",
    },
    category: String,
    timeCommitment: String,
    adminMessage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PendingCourse", pendingCourseSchema);
