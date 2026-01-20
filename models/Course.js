const mongoose = require("mongoose");

/* ---------------- DOCUMENT ---------------- */
const DocumentSchema = new mongoose.Schema(
  {
    fileUrl: String,
    fileName: String,
  },
  { _id: false }
);


const EmbeddedQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    question: { type: String,default:"" },
    answers: [
      {
        id: { type: String, default: "" },
        text: { type: String },
        correct: { type: Boolean, default: false },
      },
    ],

    type: {
      type: String,
      enum: ["single", "multiple", "True/false"],
      default: "single",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    image: { type: String, default: "" },
    hint: { type: String, default: "" },
    tags: [{ type: String, default: "" }],
  },
  { _id: false }
);

/* ---------------- ITEM ---------------- */
const ItemSchema = new mongoose.Schema(
  {
    itemId: { type: String }, // original pending item _id

    type: { type: String, required: true },
    title: String,

    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      default: null,
    },
    videoUrl: { type: String, default: "" },

    documents: [DocumentSchema],

    // Embedded questions for quizzes (synced from PendingCourse)
    // Embedded questions for quizzes (synced from PendingCourse)
    // Using Mixed Array ([]) to bypass "Cast to [string]" error
    quizQuestions: [EmbeddedQuestionSchema],

    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
    },
  },
  { _id: false }
);

/* ---------------- SECTION ---------------- */
const SectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String }, // original pending section _id
    title: String, // 🌟 FIXED: must match pendingCourse
    items: [ItemSchema],
  },
  { _id: false }
);

/* ---------------- FINAL COURSE ---------------- */
const courseSchema = new mongoose.Schema(
  {
    /* ===== Basic ===== */
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "" },
    price: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: "" },

    /* ===== Instructor ===== */
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ===== From PendingCourse (MISSING FIELDS ADDED HERE) ===== */
    learningObjectives: [String],
    requirements: [String],
    courseFor: String,
    structure: String,
    testVideo: { type: String, default: "" },
    sampleVideo: { type: String, default: "" },
    filmEdit: { type: String, default: "" },
    captions: { type: String, default: "" },
    accessibility: { type: String, default: "" },

    landingTitle: String,
    landingSubtitle: String,
    landingDesc: String,

    promoCode: String,
    promoDesc: String,

    welcomeMsg: String,
    congratsMsg: String,

    language: { type: String, default: "English" },

    /* ===== Curriculum ===== */
    curriculum: [SectionSchema],
    pendingCourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PendingCourse",
      required: true,
    },
    /* ===== Stats ===== */
    published: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
    learners: { type: Number, default: 0 },
    badges: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
