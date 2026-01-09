const mongoose = require('mongoose');

// Reply schema (embedded in Question)
const replySchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: true
    },
    isInstructor: {
        type: Boolean,
        default: false
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    upvoteCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Main Question schema
const questionSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    // Which lecture the question relates to
    lectureId: {
        type: String,
        default: null
    },
    lectureTitle: {
        type: String,
        default: null
    },

    // Author
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Question content
    title: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        default: ''
    },

    // Stats
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    upvoteCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },

    // Replies
    replies: [replySchema],
    replyCount: {
        type: Number,
        default: 0
    },

    // Featured flag (set when instructor replies)
    isFeatured: {
        type: Boolean,
        default: false
    },
    hasInstructorReply: {
        type: Boolean,
        default: false
    },

    // Users following this question
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

// Indexes for better query performance
questionSchema.index({ course: 1, isFeatured: -1, createdAt: -1 });
questionSchema.index({ course: 1, createdAt: -1 });
questionSchema.index({ author: 1 });

// Export model as CourseQuestion (to avoid conflict with QuizModel/Question.js)
module.exports = mongoose.models.CourseQuestion || mongoose.model('CourseQuestion', questionSchema);
