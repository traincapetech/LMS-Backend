const mongoose = require('mongoose');

const courseDiscussionSchema = new mongoose.Schema({
    // Course reference - which course this message belongs to
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },

    // Sender - who sent this message (student or instructor)
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // NEW: Recipient - who should receive this message (enables 1:1 private chat)
    // This makes each conversation private between sender and recipient
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Message content
    message: {
        type: String,
        required: true,
        trim: true
    },

    // Flag to identify if message is from instructor
    isInstructorMessage: {
        type: Boolean,
        default: false
    },

    // NEW: Flag to identify auto-sent welcome messages
    // Used to style/display welcome messages differently in UI
    isWelcomeMessage: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// PERFORMANCE: Compound index for fast private conversation queries
// This index speeds up queries like "get all messages between user A and user B in course X"
courseDiscussionSchema.index({ courseId: 1, sender: 1, recipient: 1 });

// Additional index for unread count queries (recipient + createdAt)
courseDiscussionSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('CourseDiscussion', courseDiscussionSchema);